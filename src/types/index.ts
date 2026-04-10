import { Types } from "mongoose";

export interface IParticipant {
  userId: Types.ObjectId;
  joinedAt: Date;
}

export interface ILastMessage {
  messageId: string;
  content: string;
  senderId: Types.ObjectId;
  createdAt: Date;
}

export interface IConversation {
  _id: Types.ObjectId;
  type: "direct" | "group";
  participants: IParticipant[];
  groupInfo?: {
    name: string;
    createdBy: Types.ObjectId;
  };
  lastMessage?: ILastMessage;
  unreadCount: Map<string, number>;
  createdAt: Date;
  updatedAt: Date;
}

export interface IMessage {
  _id: Types.ObjectId;
  conversationId: Types.ObjectId;
  senderId: Types.ObjectId;
  content: string;
  imageUrl?: string;
  messageType?: "text" | "offer";
  offerDetails?: any;
  createdAt: Date;
}
