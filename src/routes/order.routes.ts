import express, { Router } from "express";
import {
  createOrder,
  getMyOrders,
  updateOrderStatus,
} from "../controllers/order.controller";
import { protect } from "../middleware/auth.middleware";

const router: Router = express.Router();

// Tất cả các route order đều cần đăng nhập
router.use(protect);

router.post("/", createOrder);
router.get("/me", getMyOrders);
router.patch("/:orderId/status", updateOrderStatus);

export default router;
