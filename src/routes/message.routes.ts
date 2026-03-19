import express from "express";
import {
  sendDirectMessage,
  getMessages,
  getConversations,
} from "../controllers/message.controller";
import { protect } from "../middleware/auth.middleware";

const router = express.Router();

router.use(protect);

router.post("/direct", sendDirectMessage);
router.get("/:conversationId", getMessages);
router.get("/inbox/all", getConversations);

export default router;
