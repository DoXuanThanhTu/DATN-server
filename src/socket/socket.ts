import { Server } from "socket.io";
import http from "http";
import dotenv from "dotenv";

dotenv.config();

export const userSocketMap = new Map<string, string>();
export let io: Server;
export const setupSocket = (server: http.Server) => {
  io = new Server(server, {
    cors: {
      origin: ["http://localhost:3000", process.env.CLIENT_URL || ""],
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    const userId = socket.handshake.query.userId as string;
    if (userId && userId !== "undefined") {
      userSocketMap.set(userId, socket.id);
      io.emit("getOnlineUsers", Array.from(userSocketMap.keys()));
    }

    socket.on("join_conversation", (conversationId: string) => {
      socket.join(conversationId);
      console.log(`User joined room: ${conversationId}`);
    });

    socket.on("disconnect", () => {
      if (userId) {
        userSocketMap.delete(userId);
        io.emit("getOnlineUsers", Array.from(userSocketMap.keys()));
      }
    });
  });

  return io;
};
