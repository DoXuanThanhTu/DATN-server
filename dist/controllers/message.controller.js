"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getConversations = exports.getMessages = exports.sendDirectMessage = void 0;
const message_model_1 = __importDefault(require("../models/message.model"));
const conversation_model_1 = __importDefault(require("../models/conversation.model"));
const socket_1 = require("../socket/socket");
const sendDirectMessage = async (req, res) => {
    try {
        const { conversationId, content, imageUrl } = req.body;
        const senderId = req.user?._id;
        if (!senderId)
            return res.status(401).json({ message: "Unauthorized" });
        const newMessage = await message_model_1.default.create({
            conversationId,
            senderId,
            content,
            imageUrl,
        });
        const conversation = await conversation_model_1.default.findById(conversationId);
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
        socket_1.io.to(conversationId).emit("receive_message", {
            ...newMessage.toObject(),
            conversationUpdate: conversation.lastMessage,
        });
        return res.status(201).json(newMessage);
    }
    catch (error) {
        return res
            .status(500)
            .json({ message: "Lỗi hệ thống", error: error.message });
    }
};
exports.sendDirectMessage = sendDirectMessage;
const getMessages = async (req, res) => {
    try {
        const { conversationId } = req.params;
        const { limit = 20, cursor } = req.query;
        const query = { conversationId };
        if (cursor) {
            query.createdAt = { $lt: new Date(cursor) };
        }
        const messages = await message_model_1.default.find(query)
            .sort({ createdAt: -1 })
            .limit(Number(limit))
            .lean();
        return res.status(200).json(messages);
    }
    catch (error) {
        return res
            .status(500)
            .json({ message: "Lỗi lấy tin nhắn", error: error.message });
    }
};
exports.getMessages = getMessages;
const getConversations = async (req, res) => {
    try {
        const userId = req.user?._id;
        const conversations = await conversation_model_1.default.find({
            "participants.userId": userId,
        })
            .sort({ "lastMessage.createdAt": -1 })
            .populate("participants.userId", "username avatar displayName")
            .lean();
        return res.status(200).json(conversations);
    }
    catch (error) {
        return res
            .status(500)
            .json({ message: "Lỗi lấy danh sách hội thoại", error: error.message });
    }
};
exports.getConversations = getConversations;
