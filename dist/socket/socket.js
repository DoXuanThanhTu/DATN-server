"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupSocket = exports.getReceiverSocketId = exports.io = exports.userSocketMap = void 0;
const socket_io_1 = require("socket.io");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
// Map lưu trữ: userId -> socketId
exports.userSocketMap = new Map();
// Hàm tiện ích lấy socketId của người nhận
const getReceiverSocketId = (receiverId) => {
    return exports.userSocketMap.get(receiverId);
};
exports.getReceiverSocketId = getReceiverSocketId;
const setupSocket = (server) => {
    exports.io = new socket_io_1.Server(server, {
        cors: {
            origin: ["http://localhost:3000", process.env.CLIENT_URL || ""],
            credentials: true,
        },
    });
    exports.io.on("connection", (socket) => {
        const userId = socket.handshake.query.userId;
        if (userId && userId !== "undefined") {
            exports.userSocketMap.set(userId, socket.id);
            // Thông báo danh sách online
            exports.io.emit("getOnlineUsers", Array.from(exports.userSocketMap.keys()));
        }
        socket.on("join_conversation", (conversationId) => {
            socket.join(conversationId);
        });
        socket.on("disconnect", () => {
            if (userId) {
                exports.userSocketMap.delete(userId);
                exports.io.emit("getOnlineUsers", Array.from(exports.userSocketMap.keys()));
            }
        });
    });
    return exports.io;
};
exports.setupSocket = setupSocket;
