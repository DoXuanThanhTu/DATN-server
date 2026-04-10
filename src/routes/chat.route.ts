// routes/chat.route.ts
import { Router } from "express";
import {
  startConversation,
  getMessages,
  getMyConversations,
  getConversationById,
  sendMessage,
  updateOfferStatus,
  markAsRead,
} from "../controllers/chat.controller";
import { protect } from "../middleware/auth.middleware";

const router = Router();

router.post("/conversations", protect, startConversation);
router.get("/conversations", protect, getMyConversations);
router.get("/messages/:conversationId", protect, getMessages);
router.get("/conversations/:conversationId", protect, getConversationById);
router.post("/messages", protect, sendMessage);
router.put("/messages/:id/status", protect, updateOfferStatus);
router.patch("/conversations/:conversationId/read", protect, markAsRead);
export default router;
