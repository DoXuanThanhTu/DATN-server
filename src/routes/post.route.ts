import {
  approvePost,
  deletePost,
  getMyPosts,
  getRelatedProducts,
  hidePost,
  rejectPost,
  updateProduct,
} from "./../controllers/post.controller";
import express from "express";
import {
  createProduct,
  getProductDetail,
  getProducts,
} from "../controllers/post.controller";
import { authorize, checkAuth, protect } from "../middleware/auth.middleware";

const router = express.Router();

router.post("/", protect, createProduct);
router.get("/me", protect, getMyPosts);
router.get("/", checkAuth, getProducts);
router.get("/related/:id", getRelatedProducts);
router.patch("/update/:id", protect, updateProduct);
router.get("/:identity", getProductDetail);
// router.use(authorize("admin"));
router.post("/admin/:id/approve", protect, authorize("admin"), approvePost); // duyệt tin
router.post("/admin/:id/hide", protect, authorize("admin"), hidePost); // ẩn tin
router.post("/admin/:id/reject", protect, authorize("admin"), rejectPost); // từ chối duyệt tin
router.delete("/admin/:id", protect, authorize("admin"), deletePost);
export default router;
