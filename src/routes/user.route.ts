import { Router } from "express";
import { authorize, checkAuth, protect } from "../middleware/auth.middleware";
import {
  getAllUsers,
  getMe,
  updateProfile,
  getUserProfile,
  trackUserInteraction,
  getAllUsersAdmin,
  blockUser,
  updateStatus,
} from "../controllers/user.controller";

const router = Router();
router.get("/user/:id", getUserProfile);
router.get("/all", protect, getAllUsers);
router.get("/me", protect, getMe);
router.post("/status", protect, updateStatus);
router.post("/interaction", checkAuth, trackUserInteraction);
router.patch("/profile", protect, updateProfile);
router.get("/", protect, authorize("admin"), getAllUsersAdmin);
router.patch("/:id/status", protect, authorize("admin"), blockUser);
export default router;
