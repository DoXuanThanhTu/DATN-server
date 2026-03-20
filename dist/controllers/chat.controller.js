"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendMessage = exports.getConversationById = exports.getMyConversations = exports.getMessages = exports.startConversation = void 0;
const conversation_model_1 = __importDefault(require("../models/conversation.model"));
const message_model_1 = __importDefault(require("../models/message.model"));
const socket_1 = require("../socket/socket");
const startConversation = async (req, res) => {
    const { receiverId } = req.body;
    const buyerId = req.user._id;
    try {
        let conversation = await conversation_model_1.default.findOne({
            type: "direct",
            "participants.userId": { $all: [buyerId, receiverId] },
        });
        if (!conversation) {
            conversation = await conversation_model_1.default.create({
                type: "direct",
                participants: [{ userId: buyerId }, { userId: receiverId }],
                unreadCount: new Map(),
            });
        }
        res.status(200).json({ data: conversation });
    }
    catch (error) {
        res.status(500).json({ message: "Lỗi khởi tạo chat" });
    }
};
exports.startConversation = startConversation;
const getMessages = async (req, res) => {
    try {
        const { conversationId } = req.params;
        const messages = await message_model_1.default.find({ conversationId }).sort({
            createdAt: 1,
        });
        res.json({ data: messages });
    }
    catch (error) {
        res.status(500).json({ message: "Lỗi tải tin nhắn" });
    }
};
exports.getMessages = getMessages;
const getMyConversations = async (req, res) => {
    try {
        const userId = req.user._id;
        const conversations = await conversation_model_1.default.find({
            "participants.userId": userId,
        })
            .populate("participants.userId", "name username avatar displayName")
            .sort({ updatedAt: -1 });
        res.json({ data: conversations });
    }
    catch (error) {
        res.status(500).json({ message: "Lỗi tải danh sách chat" });
    }
};
exports.getMyConversations = getMyConversations;
const getConversationById = async (req, res) => {
    try {
        const { conversationId } = req.params;
        const conversation = await conversation_model_1.default.findById(conversationId)
            .populate("participants.userId", " name avatar  lastActive")
            .populate("post", "title images price");
        if (!conversation)
            return res.status(404).json({ message: "Không tìm thấy hội thoại" });
        res.json({ data: conversation });
    }
    catch (error) {
        res.status(500).json({ message: "Lỗi tải thông tin hội thoại" });
    }
};
exports.getConversationById = getConversationById;
const sendMessage = async (req, res) => {
    const { conversationId, text } = req.body;
    const senderId = req.user._id;
    try {
        const newMessage = await message_model_1.default.create({
            conversationId,
            senderId,
            content: text,
        });
        await conversation_model_1.default.findByIdAndUpdate(conversationId, {
            lastMessage: {
                messageId: newMessage._id.toString(),
                content: text,
                senderId: senderId,
                createdAt: newMessage.createdAt,
            },
        });
        if (socket_1.io) {
            socket_1.io.to(conversationId).emit("receive_message", newMessage);
        }
        res.status(201).json({ data: newMessage });
    }
    catch (error) {
        res.status(500).json({ message: "Lỗi gửi tin nhắn", error: error.message });
    }
};
exports.sendMessage = sendMessage;
