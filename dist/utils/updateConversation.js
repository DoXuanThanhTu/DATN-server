"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateConversationMetadata = void 0;
const conversation_model_1 = __importDefault(require("../models/conversation.model"));
const updateConversationMetadata = async (conversationId, lastMessageData) => {
    return await conversation_model_1.default.findByIdAndUpdate(conversationId, {
        $set: { lastMessage: lastMessageData },
        $inc: { "unreadCount.$[elem]": 1 }, // Tăng unread cho tất cả trừ người gửi
    }, {
        arrayFilters: [{ "elem.userId": { $ne: lastMessageData.senderId } }],
        new: true,
    });
};
exports.updateConversationMetadata = updateConversationMetadata;
