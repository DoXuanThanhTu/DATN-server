import { Request, Response } from "express";
import { VNPay, ProductCode, VnpLocale, ReturnQueryFromVNPay } from "vnpay";
import Order from "../models/order.model";
import Post from "../models/post.model";
import { createNotification } from "./notification.controller"; // Import hàm helper của bạn
import { postLedger } from "src/services/ledger.service";
import { holdPayment, moveToSeller } from "./ledger.controller";

// import dotenv from "dotenv";
// dotenv.config();
const vnpay = new VNPay({
  tmnCode: process.env.VNP_TMNCODE!,
  secureSecret: process.env.VNP_HASH_SECRET!,
  testMode: true,
});

// 1. Tạo URL thanh toán
export const createPayment = async (req: Request, res: Response) => {
  try {
    const { amount } = req.body || { amount: 10000 };

    const paymentUrl = vnpay.buildPaymentUrl({
      vnp_Amount: amount,
      vnp_IpAddr: req.ip || "127.0.0.1",
      vnp_TxnRef: Date.now().toString(), // random cho demo
      vnp_OrderInfo: "Thanh toan demo",
      vnp_OrderType: ProductCode.Other,
      vnp_ReturnUrl: `http://localhost:5000/api/payment/payment-result`,
    });

    res.json({
      success: true,
      paymentUrl,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const vnpayReturn = (req: Request, res: Response) => {
  try {
    const query = req.query as unknown as ReturnQueryFromVNPay;

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
  } catch (error) {
    return res.json({ success: false, message: "Lỗi xử lý return URL" });
  }
};

// 3. IPN (QUAN TRỌNG)
export const vnpayIpn = async (req: Request, res: Response) => {
  try {
    const query = req.query as unknown as ReturnQueryFromVNPay;
    console.log("IPN called for order:", query.vnp_TxnRef);

    const verify = vnpay.verifyIpnCall(query);

    if (!verify.isVerified) {
      return res.json({ RspCode: "97", Message: "Invalid checksum" });
    }

    const orderId = verify.vnp_TxnRef;

    const order = await Order.findById(orderId);

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

      await holdPayment({
        buyerId: order.buyer,
        amount: order.totalAmount,
        orderId: order._id,
      });
      await moveToSeller({
        paymentMethod: order.paymentMethod,
        sellerId: order.seller,
        amount: order.totalAmount,
        orderId: order._id,
      });
      await createNotification({
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
    await Post.findByIdAndUpdate(order.product, {
      status: "active",
    });

    return res.json({ RspCode: "01", Message: "Failed" });
  } catch (error) {
    return res.json({ RspCode: "99", Message: "Error" });
  }
};
