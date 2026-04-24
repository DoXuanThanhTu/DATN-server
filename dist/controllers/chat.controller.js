"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.markAsRead = exports.updateOfferStatus = exports.sendMessage = exports.getConversationById = exports.getMyConversations = exports.getMessages = exports.startConversation = void 0;
const conversation_model_1 = __importDefault(require("../models/conversation.model"));
const message_model_1 = __importDefault(require("../models/message.model"));
const socket_1 = require("../socket/socket");
const notification_controller_1 = require("./notification.controller");
const socket_2 = require("../socket/socket");
const notification_model_1 = __importDefault(require("../models/notification.model"));
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
            .populate("participants.userId", "name username avatar displayName lastActive")
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
    try {
        const { conversationId, content, imageUrl, messageType, offerDetails } = req.body;
        const senderId = req.user?._id;
        if (!senderId)
            return res.status(401).json({ message: "Unauthorized" });
        // 1. Tạo tin nhắn mới
        const newMessage = await message_model_1.default.create({
            conversationId,
            senderId,
            content,
            imageUrl,
            messageType: messageType || "text",
            offerDetails: offerDetails || null,
        });
        // 2. Cập nhật Conversation (Tin nhắn cuối và unreadCount)
        const conversation = await conversation_model_1.default.findById(conversationId);
        if (!conversation)
            return res.status(404).json({ message: "Hội thoại không tồn tại" });
        const lastMsgContent = messageType === "offer"
            ? `💰 Trả giá: ${offerDetails.offeredPrice.toLocaleString()}đ`
            : content || "Đã gửi hình ảnh";
        conversation.lastMessage = {
            messageId: newMessage._id.toString(),
            content: lastMsgContent,
            senderId: senderId,
            createdAt: newMessage.createdAt,
        };
        // Tăng unreadCount cho tất cả người nhận
        conversation.participants.forEach((p) => {
            const pId = p.userId.toString();
            if (pId !== senderId.toString()) {
                const currentCount = conversation.unreadCount.get(pId) || 0;
                conversation.unreadCount.set(pId, currentCount + 1);
                console.log("Đã tăng unreadCount cho người nhận:", pId);
            }
        });
        await conversation.save();
        // 3. Socket: Gửi tin nhắn realtime cho phòng chat
        const messageData = {
            ...newMessage.toObject(),
            conversationUpdate: conversation.lastMessage,
        };
        socket_1.io.to(conversationId).emit("receive_message", messageData);
        // 4. XỬ LÝ THÔNG BÁO GỘP (Notification Logic)
        conversation.participants.forEach(async (p) => {
            const receiverId = p.userId.toString();
            if (receiverId !== senderId.toString()) {
                // Lấy tổng số tin chưa đọc của người này trong hội thoại này
                const totalUnreadInConv = conversation.unreadCount.get(receiverId) || 0;
                // Gọi hàm createNotification (Hàm này đã có logic findOneAndUpdate ở bước trước)
                await (0, notification_controller_1.createNotification)({
                    receiver: receiverId,
                    sender: senderId,
                    type: "CHAT",
                    title: req.user?.name || "Tin nhắn mới",
                    content: totalUnreadInConv > 1
                        ? `[${totalUnreadInConv} tin nhắn] ${lastMsgContent}`
                        : lastMsgContent,
                    link: `/chat?conversationId=${conversationId}`,
                });
            }
        });
        return res.status(201).json(newMessage);
    }
    catch (error) {
        return res
            .status(500)
            .json({ message: "Lỗi hệ thống", error: error.message });
    }
};
exports.sendMessage = sendMessage;
// Tại controller xử lý update status offer
const updateOfferStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const updatedMessage = await message_model_1.default.findByIdAndUpdate(id, { "offerDetails.status": status }, { new: true });
        if (!updatedMessage) {
            return res.status(404).json({ message: "Không tìm thấy lời đề nghị" });
        }
        // Gửi sự kiện Socket cho tất cả người dùng trong phòng (conversation)
        // Giả sử bạn có biến io được export từ file socket.js
        socket_1.io.to(updatedMessage.conversationId.toString()).emit("offer_status_updated", {
            messageId: id,
            status: status,
            conversationId: updatedMessage.conversationId,
        });
        res.status(200).json(updatedMessage);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
};
exports.updateOfferStatus = updateOfferStatus;
const markAsRead = async (req, res) => {
    try {
        const { conversationId } = req.params;
        const userId = req.user._id.toString();
        const conversation = await conversation_model_1.default.findById(conversationId);
        if (!conversation)
            return res.status(404).json({ message: "Không tìm thấy" });
        // Reset Map trong Mongoose
        if (conversation.unreadCount) {
            conversation.unreadCount.set(userId, 0);
            // Đánh dấu Map đã thay đổi để Mongoose lưu lại
            conversation.markModified("unreadCount");
            await conversation.save();
        }
        const chatLink = `/chat?conversationId=${conversationId}`;
        await notification_model_1.default.updateMany({
            receiver: userId,
            type: "CHAT",
            link: chatLink,
        }, {
            $set: {
                isRead: true,
                content: "Đã xem " + (conversation.lastMessage?.content || ""),
            },
        });
        // Thông báo cho các tab khác của cùng user này là đã đọc (Realtime Badge)
        const receiverSocketId = (0, socket_2.getReceiverSocketId)(userId);
        if (receiverSocketId) {
            socket_1.io.to(receiverSocketId).emit("conversation_marked_read", {
                conversationId,
            });
        }
        res.status(200).json({ message: "Đã đọc", conversationId });
    }
    catch (error) {
        res.status(500).json({ message: "Lỗi hệ thống" });
    }
};
exports.markAsRead = markAsRead;
