import mongoose, { Schema, Document } from "mongoose";

export interface IOrder extends Document {
  orderNumber: string;
  buyer: mongoose.Types.ObjectId;
  seller: mongoose.Types.ObjectId;
  product: mongoose.Types.ObjectId;
  unitPrice: number;
  quantity: number;
  totalAmount: number;
  shippingAddress: {
    receiverName: string;
    phone: string;
    fullAddress: string;
  };
  paymentMethod: "cod" | "transfer";
  paymentStatus: "pending" | "paid" | "failed";
  status: "pending" | "processing" | "shipped" | "delivered" | "cancelled";
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const OrderSchema: Schema = new Schema(
  {
    orderNumber: {
      type: String,
      unique: true,
      default: () => `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    },
    buyer: { type: Schema.Types.ObjectId, ref: "User", required: true },
    seller: { type: Schema.Types.ObjectId, ref: "User", required: true },
    product: { type: Schema.Types.ObjectId, ref: "Post", required: true },
    unitPrice: { type: Number, required: true },
    quantity: { type: Number, default: 1 },
    totalAmount: { type: Number, required: true },
    shippingAddress: {
      receiverName: String,
      phone: String,
      fullAddress: String,
    },
    paymentMethod: { type: String, enum: ["cod", "transfer"], default: "cod" },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed"],
      default: "pending",
    },
    status: {
      type: String,
      enum: ["pending", "processing", "shipped", "delivered", "cancelled"],
      default: "pending",
    },
    notes: String,
  },
  { timestamps: true },
);

export default mongoose.model<IOrder>("Order", OrderSchema);
