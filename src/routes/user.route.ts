import { Router } from "express";
import { protect } from "../middleware/auth.middleware";
import { getAllUsers, updateStatus } from "../controllers/user.controller";

const router = Router();

router.post("/status", protect, updateStatus);
router.get("/all", protect, getAllUsers);
export default router;
