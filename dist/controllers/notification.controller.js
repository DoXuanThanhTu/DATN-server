"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getNotificationStats = exports.markAllAsRead = exports.markAsRead = exports.getNotifications = exports.createNotification = void 0;
const notification_model_1 = __importDefault(require("../models/notification.model"));
const socket_1 = require("../socket/socket");
// Hàm helper để dùng trong nội bộ Backend (không có req, res)
const createNotification = async (payload) => {
    try {
        const receiverId = payload.receiver.toString();
        const receiverSocketId = (0, socket_1.getReceiverSocketId)(receiverId);
        let finalNoti;
        // Nếu là thông báo tin nhắn, thử gộp vào thông báo cũ chưa đọc
        if (payload.type === "CHAT") {
            finalNoti = await notification_model_1.default.findOneAndUpdate({
                receiver: payload.receiver,
                sender: payload.sender, // Cùng một người gửi
                type: "CHAT",
                link: payload.link, // Cùng một hội thoại (thường chứa conversationId)
            }, {
                $set: {
                    content: payload.content, // Cập nhật nội dung tin nhắn mới nhất
                    isRead: false,
                    createdAt: new Date(), // Đưa thông báo lên đầu danh sách
                },
            }, { new: true });
        }
        // Nếu không tìm thấy thông báo cũ để gộp (hoặc không phải type CHAT) -> Tạo mới
        if (!finalNoti) {
            finalNoti = await notification_model_1.default.create(payload);
        }
        // Phát tín hiệu Socket
        const populatedNoti = await notification_model_1.default.findById(finalNoti._id)
            .populate("sender", "name avatar") // Chỉ lấy name và avatar cho nhẹ
            .populate("receiver", "name avatar");
        if (receiverSocketId && populatedNoti) {
            socket_1.io.to(receiverSocketId).emit("newNotification", populatedNoti.toObject());
            console.log(`✅ Realtime notification sent to ${receiverId}`);
        }
        return finalNoti;
    }
    catch (error) {
        console.error("❌ Socket Sync Error:", error);
    }
};
exports.createNotification = createNotification;
// API: Lấy danh sách thông báo (Khắc phục lỗi 404 cho api.get("/notifications"))
const getNotifications = async (req, res) => {
    try {
        const userId = req.user?._id;
        const notifications = await notification_model_1.default.find({ receiver: userId })
            .sort({ createdAt: -1 })
            .populate("sender", "name avatar")
            .populate("receiver", "name avatar")
            .limit(5); // Lấy 5 cái mới nhất
        res.status(200).json({ success: true, data: notifications });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.getNotifications = getNotifications;
// API: Đánh dấu 1 thông báo là đã đọc
const markAsRead = async (req, res) => {
    try {
        const { notiId } = req.params;
        await notification_model_1.default.findByIdAndUpdate(notiId, { isRead: true });
        res.status(200).json({ success: true, message: "Đã xem" });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.markAsRead = markAsRead;
// API: Đánh dấu tất cả là đã đọc (Khắc phục lỗi cho markAllAsRead ở Frontend)
const markAllAsRead = async (req, res) => {
    try {
        const userId = req.user?._id;
        await notification_model_1.default.updateMany({ receiver: userId, isRead: false }, { isRead: true });
        res.status(200).json({ success: true, message: "Đã xem tất cả" });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.markAllAsRead = markAllAsRead;
// API: Lấy thống kê (Hàm bạn đã viết)
const getNotificationStats = async (req, res) => {
    try {
        const userId = req.user?._id;
        const stats = await notification_model_1.default.aggregate([
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
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.getNotificationStats = getNotificationStats;
