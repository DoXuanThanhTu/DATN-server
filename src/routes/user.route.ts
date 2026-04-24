import { Router } from "express";
import { protect } from "../middleware/auth.middleware";
import {
  getAllUsers,
  updateStatus,
  getMe,
  updateProfile,
  getUserProfile,
} from "../controllers/user.controller";

const router = Router();
router.get("/user/:id", getUserProfile);
router.post("/status", protect, updateStatus);
router.get("/all", protect, getAllUsers);
router.get("/me", protect, getMe);
router.patch("/profile", protect, updateProfile);
export default router;
