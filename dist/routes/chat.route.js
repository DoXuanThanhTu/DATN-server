"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// routes/chat.route.ts
const express_1 = require("express");
const chat_controller_1 = require("../controllers/chat.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
router.post("/conversations", auth_middleware_1.protect, chat_controller_1.startConversation);
router.get("/conversations", auth_middleware_1.protect, chat_controller_1.getMyConversations);
router.get("/messages/:conversationId", auth_middleware_1.protect, chat_controller_1.getMessages);
router.get("/conversations/:conversationId", auth_middleware_1.protect, chat_controller_1.getConversationById);
router.post("/messages", auth_middleware_1.protect, chat_controller_1.sendMessage);
exports.default = router;
