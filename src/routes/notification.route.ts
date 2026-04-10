import express from "express";
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  getNotificationStats,
} from "../controllers/notification.controller";
import { protect } from "../middleware/auth.middleware";

const router = express.Router();

router.use(protect);

router.get("/", getNotifications);
router.get("/stats", getNotificationStats);
router.patch("/read-all", markAllAsRead);
router.patch("/:notiId/read", markAsRead);

export default router;
