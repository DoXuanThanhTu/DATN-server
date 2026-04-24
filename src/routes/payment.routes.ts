import express from "express";
import {
  createPayment,
  vnpayReturn,
  vnpayIpn,
} from "../controllers/payment.controller";

const router = express.Router();

// Tạo payment URL
router.post("/create", createPayment);

// VNPay redirect về
router.get("/return", vnpayReturn);

// VNPay gọi server (IPN)
router.get("/ipn", vnpayIpn);

export default router;
