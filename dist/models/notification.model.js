"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const notificationSchema = new mongoose_1.default.Schema({
    receiver: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    sender: { type: mongoose_1.default.Schema.Types.ObjectId, ref: "User" }, // Có thể null nếu là thông báo hệ thống
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
exports.default = mongoose_1.default.model("Notification", notificationSchema);
