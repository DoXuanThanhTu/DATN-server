"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.vnpayIpn = exports.vnpayReturn = exports.createPayment = void 0;
const vnpay_1 = require("vnpay");
const order_model_1 = __importDefault(require("../models/order.model"));
const post_model_1 = __importDefault(require("../models/post.model"));
const notification_controller_1 = require("./notification.controller"); // Import hàm helper của bạn
const ledger_controller_1 = require("./ledger.controller");
// import dotenv from "dotenv";
// dotenv.config();
const vnpay = new vnpay_1.VNPay({
    tmnCode: process.env.VNP_TMNCODE,
    secureSecret: process.env.VNP_HASH_SECRET,
    testMode: true,
});
// 1. Tạo URL thanh toán
const createPayment = async (req, res) => {
    try {
        const { amount } = req.body || { amount: 10000 };
        const paymentUrl = vnpay.buildPaymentUrl({
            vnp_Amount: amount,
            vnp_IpAddr: req.ip || "127.0.0.1",
            vnp_TxnRef: Date.now().toString(), // random cho demo
            vnp_OrderInfo: "Thanh toan demo",
            vnp_OrderType: vnpay_1.ProductCode.Other,
            vnp_ReturnUrl: `http://localhost:5000/api/payment/payment-result`,
        });
        res.json({
            success: true,
            paymentUrl,
        });
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};
exports.createPayment = createPayment;
const vnpayReturn = (req, res) => {
    try {
        const query = req.query;
        const verify = vnpay.verifyReturnUrl(query);
        if (!verify.isVerified) {
            return res.json({
                success: false,
                message: "Sai chữ ký (invalid checksum)",
            });
        }
        if (!verify.isSuccess) {
            return res.json({ success: false, message: "Thanh toán thất bại" });
        }
        return res.json({ success: true, message: "Thanh toán thành công 🎉" });
    }
    catch (error) {
        return res.json({ success: false, message: "Lỗi xử lý return URL" });
    }
};
exports.vnpayReturn = vnpayReturn;
// 3. IPN (QUAN TRỌNG)
const vnpayIpn = async (req, res) => {
    try {
        const query = req.query;
        console.log("IPN called for order:", query.vnp_TxnRef);
        const verify = vnpay.verifyIpnCall(query);
        if (!verify.isVerified) {
            return res.json({ RspCode: "97", Message: "Invalid checksum" });
        }
        const orderId = verify.vnp_TxnRef;
        const order = await order_model_1.default.findById(orderId);
        if (!order) {
            return res.json({ RspCode: "01", Message: "Order not found" });
        }
        if (order.paymentStatus === "paid") {
            return res.json({ RspCode: "00", Message: "Already processed" });
        }
        if (verify.isSuccess) {
            order.paymentStatus = "paid";
            order.status = "pending";
            await order.save();
            await (0, ledger_controller_1.holdPayment)({
                buyerId: order.buyer,
                amount: order.totalAmount,
                orderId: order._id,
            });
            await (0, ledger_controller_1.moveToSeller)({
                paymentMethod: order.paymentMethod,
                sellerId: order.seller,
                amount: order.totalAmount,
                orderId: order._id,
            });
            await (0, notification_controller_1.createNotification)({
                receiver: order.seller,
                type: "ORDER",
                title: "Thanh toán thành công",
                content: `Đơn hàng ${order._id} đã thanh toán`,
                link: `/my-orders?tab=selling`,
            });
            return res.json({ RspCode: "00", Message: "Success" });
        }
        order.status = "cancelled";
        order.paymentStatus = "failed";
        await order.save();
        await post_model_1.default.findByIdAndUpdate(order.product, {
            status: "active",
        });
        return res.json({ RspCode: "01", Message: "Failed" });
    }
    catch (error) {
        return res.json({ RspCode: "99", Message: "Error" });
    }
};
exports.vnpayIpn = vnpayIpn;
