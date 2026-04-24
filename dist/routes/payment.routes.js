"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const payment_controller_1 = require("../controllers/payment.controller");
const router = express_1.default.Router();
// Tạo payment URL
router.post("/create", payment_controller_1.createPayment);
// VNPay redirect về
router.get("/return", payment_controller_1.vnpayReturn);
// VNPay gọi server (IPN)
router.get("/ipn", payment_controller_1.vnpayIpn);
exports.default = router;
