import express from "express";
import { protect } from "../middleware/auth.middleware";
import {
  createReview,
  getUserReviews,
  getMyReviews,
  updateReview, // Hàm chúng ta vừa viết ở bước trước
} from "../controllers/reviews.controller";

const router = express.Router();

router.post("/", protect, createReview);
router.get("/me", protect, getMyReviews);
router.get("/user/:userId", getUserReviews);

// Route chỉnh sửa đánh giá cụ thể
router.patch("/:reviewId", protect, updateReview);

export default router;
