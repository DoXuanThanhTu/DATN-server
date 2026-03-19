import { Request, Response } from "express";
import Message from "../models/message.model";
import Conversation from "../models/conversation.model";
import { AuthRequest } from "../middleware/auth.middleware";
import { io } from "../socket/socket";

export const sendDirectMessage = async (req: AuthRequest, res: Response) => {
  try {
    const { conversationId, content, imageUrl } = req.body;
    const senderId = req.user?._id;

    if (!senderId) return res.status(401).json({ message: "Unauthorized" });

    const newMessage = await Message.create({
      conversationId,
      senderId,
      content,
      imageUrl,
    });

    const conversation = await Conversation.findById(conversationId);
    if (!conversation)
      return res.status(404).json({ message: "Hội thoại không tồn tại" });

    conversation.lastMessage = {
      messageId: newMessage._id.toString(),
      content: content || "Đã gửi một hình ảnh",
      senderId: senderId,
      createdAt: newMessage.createdAt,
    };

    conversation.participants.forEach((p) => {
      const pId = p.userId.toString();
      if (pId !== senderId.toString()) {
        const currentCount = conversation.unreadCount.get(pId) || 0;
        conversation.unreadCount.set(pId, currentCount + 1);
      }
    });

    await conversation.save();

    io.to(conversationId).emit("receive_message", {
      ...newMessage.toObject(),
      conversationUpdate: conversation.lastMessage,
    });

    return res.status(201).json(newMessage);
  } catch (error: any) {
    return res
      .status(500)
      .json({ message: "Lỗi hệ thống", error: error.message });
  }
};

export const getMessages = async (req: Request, res: Response) => {
  try {
    const { conversationId } = req.params;
    const { limit = 20, cursor } = req.query;

    const query: any = { conversationId };

    if (cursor) {
      query.createdAt = { $lt: new Date(cursor as string) };
    }

    const messages = await Message.find(query)
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .lean();

    return res.status(200).json(messages);
  } catch (error: any) {
    return res
      .status(500)
      .json({ message: "Lỗi lấy tin nhắn", error: error.message });
  }
};

export const getConversations = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;

    const conversations = await Conversation.find({
      "participants.userId": userId,
    })
      .sort({ "lastMessage.createdAt": -1 })
      .populate("participants.userId", "username avatar displayName")
      .lean();

    return res.status(200).json(conversations);
  } catch (error: any) {
    return res
      .status(500)
      .json({ message: "Lỗi lấy danh sách hội thoại", error: error.message });
  }
};
