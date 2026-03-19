// routes/category.route.ts
import { Router } from "express";
import {
  getCategories,
  createCategory,
} from "../controllers/category.controller";
import { protect } from "../middleware/auth.middleware";
const router = Router();

router.get("/", getCategories);

router.post("/", protect, createCategory);

export default router;
