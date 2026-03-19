import Conversation from "../models/conversation.model";
import { Types } from "mongoose";

export const updateConversationMetadata = async (
  conversationId: string | Types.ObjectId,
  lastMessageData: {
    messageId: string;
    content: string;
    senderId: Types.ObjectId;
    createdAt: Date;
  },
) => {
  return await Conversation.findByIdAndUpdate(
    conversationId,
    {
      $set: { lastMessage: lastMessageData },
      $inc: { "unreadCount.$[elem]": 1 }, // Tăng unread cho tất cả trừ người gửi
    },
    {
      arrayFilters: [{ "elem.userId": { $ne: lastMessageData.senderId } }],
      new: true,
    },
  );
};
