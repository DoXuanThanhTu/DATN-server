import express from "express";
import {
  createProduct,
  getProductDetail,
  getProducts,
} from "../controllers/post.controller";
import { protect } from "../middleware/auth.middleware";

const router = express.Router();

router.post("/", protect, createProduct);

router.get("/", getProducts);

router.get("/:identity", getProductDetail);

export default router;
