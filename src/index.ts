import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import http from "http";
import connectDB from "./configs/db";
import { setupSocket } from "./socket/socket";

// Route imports
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
import orderRoutes from "./routes/order.routes";
import notificationRoute from "./routes/notification.route";

dotenv.config();

const app = express();

const allowedOrigins = [
  "https://datn-client-alpha.vercel.app",
  "http://localhost:3001",
  "http://localhost:3000",
];

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(
        new Error("CORS policy: This origin is not allowed by Access Control"),
      );
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json());

const server = http.createServer(app);

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

  console.log(`User connected: ${userId}`);

  socket.on("disconnect", () => {
    if (userId) userSocketMap.delete(userId);
    io.emit("getOnlineUsers", Array.from(userSocketMap.keys()));
  });
});

connectDB();
app.get("/", (req, res) => {
  res.status(200).send("Server is running");
});
app.get("/health", (req, res) => {
  res.status(200).send("Server is healthy");
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
app.use("/api/orders", orderRoutes);
app.use("/api/reviews", reviewRoute);
app.use("/api/notifications", notificationRoute);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
