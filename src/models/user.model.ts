import mongoose, { Schema, Document } from "mongoose";

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  phone?: string; // Thêm mới
  avatar?: string;
  gender?: "male" | "female" | "other"; // Thêm mới
  address?: {
    provinceCode: string;
    provinceName: string;
    wardCode: string;
    wardName: string;
    detail: string;
    fullAddress: string;
    lat?: number;
    lng?: number;
  };
  role: "user" | "admin";
  rating: number;
  totalReviews: number;
  isActive: boolean;
  lastActive: Date;
}

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      index: true,
    },
    password: { type: String, required: true },
    phone: { type: String, default: "" }, // Số điện thoại
    avatar: { type: String, default: "" },
    gender: {
      type: String,
      enum: ["male", "female", "other"],
      default: "other",
    },
    address: {
      provinceCode: { type: String, required: false, index: true },
      provinceName: { type: String, required: false },
      wardCode: { type: String, required: false, index: true },
      wardName: { type: String, required: false },
      detail: { type: String },
      fullAddress: { type: String },
      lat: Number,
      lng: Number,
    },
    role: { type: String, enum: ["user", "admin"], default: "user" },
    rating: { type: Number, default: 0 },
    totalReviews: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    lastActive: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

export default mongoose.models.User ||
  mongoose.model<IUser>("User", userSchema);
