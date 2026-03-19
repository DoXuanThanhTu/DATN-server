import { Router } from "express";
import { protect } from "../middleware/auth.middleware";

import {
  createReview,
  getMySentReviews,
} from "../controllers/reviews.controller";

const router = Router();

router.get("/", protect, getMySentReviews);
router.post("/", protect, createReview);
export default router;
