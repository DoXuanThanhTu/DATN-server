import { AuthRequest } from "src/middleware/auth.middleware";
import Notification from "../models/notification.model";
import { getReceiverSocketId, io } from "../socket/socket";
import { Response } from "express";
import User from "../models/user.model";

// Hàm helper để dùng trong nội bộ Backend (không có req, res)
export const createNotification = async (payload: any) => {
  try {
    const receiverId = payload.receiver.toString();
    const receiverSocketId = getReceiverSocketId(receiverId);

    let finalNoti;

    // Nếu là thông báo tin nhắn, thử gộp vào thông báo cũ chưa đọc
    if (payload.type === "CHAT") {
      finalNoti = await Notification.findOneAndUpdate(
        {
          receiver: payload.receiver,
          sender: payload.sender, // Cùng một người gửi
          type: "CHAT",
          link: payload.link, // Cùng một hội thoại (thường chứa conversationId)
        },
        {
          $set: {
            content: payload.content, // Cập nhật nội dung tin nhắn mới nhất
            isRead: false,
            createdAt: new Date(), // Đưa thông báo lên đầu danh sách
          },
        },
        { new: true }, // Trả về document sau khi đã update
      );
    }

    // Nếu không tìm thấy thông báo cũ để gộp (hoặc không phải type CHAT) -> Tạo mới
    if (!finalNoti) {
      finalNoti = await Notification.create(payload);
    }

    // Phát tín hiệu Socket
    const populatedNoti = await Notification.findById(finalNoti._id)
      .populate("sender", "name avatar") // Chỉ lấy name và avatar cho nhẹ
      .populate("receiver", "name avatar");

    if (receiverSocketId && populatedNoti) {
      io.to(receiverSocketId).emit("newNotification", populatedNoti.toObject());
      console.log(`✅ Realtime notification sent to ${receiverId}`);
    }
    return finalNoti;
  } catch (error) {
    console.error("❌ Socket Sync Error:", error);
  }
};
// API: Lấy danh sách thông báo (Khắc phục lỗi 404 cho api.get("/notifications"))
export const getNotifications = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;
    const notifications = await Notification.find({ receiver: userId })
      .sort({ createdAt: -1 })
      .populate("sender", "name avatar")
      .populate("receiver", "name avatar")
      .limit(5); // Lấy 5 cái mới nhất

    res.status(200).json({ success: true, data: notifications });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// API: Đánh dấu 1 thông báo là đã đọc
export const markAsRead = async (req: AuthRequest, res: Response) => {
  try {
    const { notiId } = req.params;
    await Notification.findByIdAndUpdate(notiId, { isRead: true });
    res.status(200).json({ success: true, message: "Đã xem" });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// API: Đánh dấu tất cả là đã đọc (Khắc phục lỗi cho markAllAsRead ở Frontend)
export const markAllAsRead = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;
    await Notification.updateMany(
      { receiver: userId, isRead: false },
      { isRead: true },
    );
    res.status(200).json({ success: true, message: "Đã xem tất cả" });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// API: Lấy thống kê (Hàm bạn đã viết)
export const getNotificationStats = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;
    const stats = await Notification.aggregate([
      { $match: { receiver: userId } },
      {
        $group: {
          _id: "$type",
          unreadCount: {
            $sum: { $cond: [{ $eq: ["$isRead", false] }, 1, 0] },
          },
          total: { $sum: 1 },
        },
      },
    ]);
    res.json({ success: true, data: stats });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
