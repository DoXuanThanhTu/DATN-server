"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getReceiverSocketId = exports.userSocketMap = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const http_1 = __importDefault(require("http"));
const db_1 = __importDefault(require("./configs/db"));
const socket_1 = require("./socket/socket");
// Route imports
const user_route_1 = __importDefault(require("./routes/user.route"));
const upload_route_1 = __importDefault(require("./routes/upload.route"));
const imagekit_route_1 = __importDefault(require("./routes/imagekit.route"));
const location_route_1 = __importDefault(require("./routes/location.route"));
const post_route_1 = __importDefault(require("./routes/post.route"));
const review_route_1 = __importDefault(require("./routes/review.route"));
const favorite_route_1 = __importDefault(require("./routes/favorite.route"));
const history_route_1 = __importDefault(require("./routes/history.route"));
const category_route_1 = __importDefault(require("./routes/category.route"));
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const chat_route_1 = __importDefault(require("./routes/chat.route"));
const message_routes_1 = __importDefault(require("./routes/message.routes"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const allowedOrigins = [
    "https://datn-client-alpha.vercel.app",
    "http://localhost:3001",
    "http://localhost:3000",
];
const corsOptions = {
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        }
        else {
            callback(new Error("CORS policy: This origin is not allowed by Access Control"));
        }
    },
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    credentials: true,
};
app.use((0, cors_1.default)(corsOptions));
app.use(express_1.default.json());
const server = http_1.default.createServer(app);
const io = (0, socket_1.setupSocket)(server);
exports.userSocketMap = new Map();
const getReceiverSocketId = (receiverId) => exports.userSocketMap.get(receiverId);
exports.getReceiverSocketId = getReceiverSocketId;
io.on("connection", (socket) => {
    const userId = socket.handshake.query.userId;
    if (userId && userId !== "undefined") {
        exports.userSocketMap.set(userId, socket.id);
        io.emit("getOnlineUsers", Array.from(exports.userSocketMap.keys()));
    }
    console.log(`User connected: ${userId}`);
    socket.on("disconnect", () => {
        if (userId)
            exports.userSocketMap.delete(userId);
        io.emit("getOnlineUsers", Array.from(exports.userSocketMap.keys()));
    });
});
(0, db_1.default)();
app.get("/health", (req, res) => {
    res.status(200).send("Server is healthy");
});
app.use("/api/users", user_route_1.default);
app.use("/api", upload_route_1.default);
app.use("/api/photos", imagekit_route_1.default);
app.use("/api/locations", location_route_1.default);
app.use("/api/auth", auth_routes_1.default);
app.use("/api/posts", post_route_1.default);
app.use("/api/reviews", review_route_1.default);
app.use("/api/favorites", favorite_route_1.default);
app.use("/api/history", history_route_1.default);
app.use("/api/categories", category_route_1.default);
app.use("/api/chat", chat_route_1.default);
app.use("/api/messages", message_routes_1.default);
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
