import { Router } from "express";
import { protect } from "../middleware/auth.middleware";
import {
  getAllUsers,
  updateStatus,
  getMe,
  updateProfile,
} from "../controllers/user.controller";

const router = Router();

router.post("/status", protect, updateStatus);
router.get("/all", protect, getAllUsers);
router.get("/me", protect, getMe);
router.patch("/profile", protect, updateProfile);
export default router;
