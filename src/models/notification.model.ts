import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema({
  receiver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // Có thể null nếu là thông báo hệ thống
  type: {
    type: String,
    enum: ["SYSTEM", "ORDER", "REVIEW", "CHAT", "NEWS"],
    required: true,
  },
  title: { type: String, required: true },
  content: { type: String, required: true },
  link: { type: String }, // Đường dẫn để khi click vào sẽ điều hướng (VD: /orders/123)
  isRead: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

// Index để truy vấn nhanh số thông báo chưa đọc của 1 user
notificationSchema.index({ receiver: 1, isRead: 1 });

export default mongoose.model("Notification", notificationSchema);
