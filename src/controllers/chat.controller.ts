import { Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware";
import Conversation from "../models/conversation.model";
import Message from "../models/message.model";
import { io } from "../socket/socket";

export const startConversation = async (req: AuthRequest, res: Response) => {
  const { receiverId } = req.body;
  const buyerId = req.user!._id;

  try {
    let conversation = await Conversation.findOne({
      type: "direct",
      "participants.userId": { $all: [buyerId, receiverId] },
    });

    if (!conversation) {
      conversation = await Conversation.create({
        type: "direct",
        participants: [{ userId: buyerId }, { userId: receiverId }],
        unreadCount: new Map(),
      });
    }

    res.status(200).json({ data: conversation });
  } catch (error) {
    res.status(500).json({ message: "Lỗi khởi tạo chat" });
  }
};

export const getMessages = async (req: AuthRequest, res: Response) => {
  try {
    const { conversationId } = req.params;
    const messages = await Message.find({ conversationId }).sort({
      createdAt: 1,
    });
    res.json({ data: messages });
  } catch (error) {
    res.status(500).json({ message: "Lỗi tải tin nhắn" });
  }
};
export const getMyConversations = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!._id;

    const conversations = await Conversation.find({
      "participants.userId": userId,
    })
      .populate("participants.userId", "name username avatar displayName")
      .sort({ updatedAt: -1 });

    res.json({ data: conversations });
  } catch (error) {
    res.status(500).json({ message: "Lỗi tải danh sách chat" });
  }
};
export const getConversationById = async (req: AuthRequest, res: Response) => {
  try {
    const { conversationId } = req.params;
    const conversation = await Conversation.findById(conversationId)
      .populate("participants.userId", " name avatar  lastActive")
      .populate("post", "title images price");

    if (!conversation)
      return res.status(404).json({ message: "Không tìm thấy hội thoại" });

    res.json({ data: conversation });
  } catch (error) {
    res.status(500).json({ message: "Lỗi tải thông tin hội thoại" });
  }
};
export const sendMessage = async (req: AuthRequest, res: Response) => {
  const { conversationId, text } = req.body;
  const senderId = req.user!._id;

  try {
    const newMessage = await Message.create({
      conversationId,
      senderId,
      content: text,
    });

    await Conversation.findByIdAndUpdate(conversationId, {
      lastMessage: {
        messageId: newMessage._id.toString(),
        content: text,
        senderId: senderId,
        createdAt: newMessage.createdAt,
      },
    });

    if (io) {
      io.to(conversationId).emit("receive_message", newMessage);
    }

    res.status(201).json({ data: newMessage });
  } catch (error: any) {
    res.status(500).json({ message: "Lỗi gửi tin nhắn", error: error.message });
  }
};
