import { Router } from "express";
import { checkAuth, protect } from "../middleware/auth.middleware";
import {
  getAllUsers,
  updateStatus,
  getMe,
  updateProfile,
  getUserProfile,
  trackUserInteraction,
} from "../controllers/user.controller";

const router = Router();
router.get("/", getAllUsers);
router.get("/user/:id", getUserProfile);
router.post("/status", protect, updateStatus);
router.get("/all", protect, getAllUsers);
router.get("/me", protect, getMe);
router.post("/interaction", checkAuth, trackUserInteraction);
router.patch("/profile", protect, updateProfile);
export default router;
