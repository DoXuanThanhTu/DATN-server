import mongoose, { Schema, Document } from "mongoose";
import { IConversation } from "../types";

export interface IConversationDocument extends IConversation, Document {}

const ConversationSchema: Schema = new Schema(
  {
    type: { type: String, enum: ["direct", "group"], required: true },
    participants: [
      {
        userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
        joinedAt: { type: Date, default: Date.now },
      },
    ],
    groupInfo: {
      name: { type: String },
      createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    },
    lastMessage: {
      messageId: { type: String },
      content: { type: String },
      senderId: { type: Schema.Types.ObjectId, ref: "User" },
      createdAt: { type: Date },
    },
    unreadCount: {
      type: Map,
      of: Number,
      default: new Map(),
    },
  },
  { timestamps: true },
);

ConversationSchema.index({ "participants.userId": 1, updatedAt: -1 });

export default mongoose.model<IConversationDocument>(
  "Conversation",
  ConversationSchema,
);
