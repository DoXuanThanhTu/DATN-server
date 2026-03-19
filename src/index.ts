import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import http from "http";
import { Server } from "socket.io";
import connectDB from "./configs/db";
import userRoute from "./routes/user.route";
import uploadRoute from "./routes/upload.route";
import imagekitRoute from "./routes/imagekit.route";
import locationRoute from "./routes/location.route";
import postRoute from "./routes/post.route";
import reviewRoute from "./routes/review.route";
import favoriteRoute from "./routes/favorite.route";
import historyRoute from "./routes/history.route";
import categoryRoute from "./routes/category.route";
import authRoute from "./routes/auth.routes";
import chatRoute from "./routes/chat.route";
import messageRoute from "./routes/message.routes";
dotenv.config();
const app = express();
const server = http.createServer(app);
import { setupSocket } from "./socket/socket";
const io = setupSocket(server);

export const userSocketMap = new Map<string, string>();
export const getReceiverSocketId = (receiverId: string) =>
  userSocketMap.get(receiverId);

io.on("connection", (socket) => {
  const userId = socket.handshake.query.userId as string;

  if (userId && userId !== "undefined") {
    userSocketMap.set(userId, socket.id);
    io.emit("getOnlineUsers", Array.from(userSocketMap.keys()));
  }

  console.log(` User connected: ${userId} (Socket ID: ${socket.id})`);

  socket.on("disconnect", () => {
    if (userId) userSocketMap.delete(userId);
    io.emit("getOnlineUsers", Array.from(userSocketMap.keys()));
    console.log(` User disconnected: ${userId}`);
  });
});

app.use(cors());
app.use(express.json());

connectDB();
app.use("/", (req, res) => {
  res.send("Server is running");
});
app.use("/checkhealth", (req, res) => {
  res.send("Server is healthy");
});
app.use("/api/users", userRoute);
app.use("/api", uploadRoute);
app.use("/api/photos", imagekitRoute);
app.use("/api/locations", locationRoute);
app.use("/api/auth", authRoute);
app.use("/api/posts", postRoute);
app.use("/api/reviews", reviewRoute);
app.use("/api/favorites", favoriteRoute);
app.use("/api/history", historyRoute);
app.use("/api/categories", categoryRoute);
app.use("/api/chat", chatRoute);
app.use("/api/messages", messageRoute);
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
