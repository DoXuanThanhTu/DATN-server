import mongoose, { Schema, Document } from "mongoose";
import { IMessage } from "../types";

export interface IMessageDocument extends IMessage, Document {}

const MessageSchema: Schema = new Schema(
  {
    conversationId: {
      type: Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
    },
    senderId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    content: { type: String, trim: true },
    imageUrl: { type: String, default: null },
    messageType: {
      type: String,
      enum: ["text", "offer"],
      default: "text",
    },
    offerDetails: {
      productId: { type: Schema.Types.ObjectId, ref: "Product" },
      productName: String,
      productImage: String,
      originalPrice: Number,
      offeredPrice: Number,
      status: {
        type: String,
        enum: ["pending", "accepted", "rejected"],
        default: "pending",
      },
    },
  },
  { timestamps: true },
);

MessageSchema.index({ conversationId: 1, createdAt: -1 });

export default mongoose.model<IMessageDocument>("Message", MessageSchema);
