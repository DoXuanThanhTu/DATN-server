import { Response } from "express";
import Order from "../models/order.model";
import Post from "../models/post.model";
import { AuthRequest } from "../middleware/auth.middleware";
import Review from "../models/review.model";
import { createNotification } from "./notification.controller"; // Import hàm helper của bạn
import { VNPay, ProductCode, VnpLocale, ReturnQueryFromVNPay } from "vnpay";
import dotenv from "dotenv";
import {
  holdPayment,
  moveToSeller,
  refund,
  settleSeller,
} from "./ledger.controller";
dotenv.config();
const vnpay = new VNPay({
  tmnCode: process.env.VNP_TMNCODE! || "6FJ3PPW9",
  secureSecret:
    process.env.VNP_HASH_SECRET! || "7U07PDDWDU8UGGS9D1Z7WAJUDWXCVWMK",
  testMode: true,
});
export const createOrder = async (req: AuthRequest, res: Response) => {
  try {
    const {
      productId,
      quantity,
      shippingAddress,
      paymentMethod,
      negotiatedPrice,
    } = req.body;

    const product = await Post.findById(productId);

    if (!product || product.status !== "active") {
      return res.status(400).json({
        success: false,
        message: "Sản phẩm không khả dụng",
      });
    }

    const price = negotiatedPrice || product.price;

    // =========================
    // 1. CREATE ORDER
    // =========================
    const newOrder = await Order.create({
      buyer: req.user?._id,
      seller: product.seller,
      product: productId,
      unitPrice: price,
      quantity: quantity || 1,
      totalAmount: price * (quantity || 1),
      shippingAddress,
      paymentStatus: paymentMethod === "vnpay" ? "pending" : "unpaid",
      paymentMethod,
      status: "pending",
    });

    // =========================
    // 2. LOCK PRODUCT
    // =========================
    await Post.findByIdAndUpdate(productId, {
      status: "hidden",
    });

    // =========================
    // 3. NOTIFICATION
    // =========================

    // =========================
    // 4. VNPay flow
    // =========================
    if (paymentMethod === "vnpay") {
      const paymentUrl = vnpay.buildPaymentUrl({
        vnp_Amount: newOrder.totalAmount,
        vnp_IpAddr: req.ip || "127.0.0.1",
        vnp_TxnRef: newOrder._id.toString(),
        vnp_OrderInfo: `Thanh toán đơn hàng ${newOrder._id}`,
        vnp_OrderType: ProductCode.Other,
        vnp_ReturnUrl: process.env.VNP_RETURN_URL!,
      });

      return res.status(201).json({
        success: true,
        paymentUrl,
        orderId: newOrder._id,
      });
    }

    // =========================
    // 5. COD CASE (giữ nguyên)
    // =========================
    await createNotification({
      receiver: product.seller,
      sender: req.user?._id,
      type: "ORDER",
      title: "Đơn hàng mới",
      content: `Bạn có đơn hàng mới: ${product.title}`,
      link: `/my-orders?tab=selling`,
    });

    return res.status(201).json({
      success: true,
      data: newOrder,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// 2. Lấy danh sách đơn hàng theo Role và Status (Giữ nguyên)
export const getMyOrders = async (req: AuthRequest, res: Response) => {
  try {
    const { status, role } = req.query;
    const userId = req.user?._id;
    const filter: any = {};

    if (role === "seller") {
      filter.seller = userId;
    } else {
      filter.buyer = userId;
    }

    if (status && status !== "all") {
      filter.status = status;
    }

    // Sử dụng .lean() để có thể thêm field ảo isReviewed vào object
    const orders = await Order.find(filter)
      .populate("product", "title images price")
      .populate("buyer", "name avatar phone")
      .populate("seller", "name avatar phone")
      .sort({ createdAt: -1 })
      .lean();

    // Kiểm tra trạng thái đánh giá cho từng đơn hàng
    const ordersWithReviewStatus = await Promise.all(
      orders.map(async (order) => {
        // Chỉ kiểm tra đánh giá nếu đơn hàng đã giao thành công
        if (order.status === "delivered") {
          const review = await Review.findOne({
            order: order._id,
            reviewer: userId,
            // Nếu tôi đang xem đơn với tư cách người mua, tìm review loại BUYER_TO_SELLER
            type: role === "seller" ? "SELLER_TO_BUYER" : "BUYER_TO_SELLER",
          });
          return { ...order, isReviewed: !!review };
        }
        return { ...order, isReviewed: false };
      }),
    );

    res.json({ success: true, data: ordersWithReviewStatus });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 3. Cập nhật trạng thái đơn hàng & Tự động đồng bộ trạng thái Post
export const updateOrderStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { orderId } = req.params;
    const { status, cancelReason } = req.body;
    const userId = req.user?._id;

    const order = await Order.findById(orderId);
    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy đơn hàng" });
    }
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    const isBuyer = order.buyer.toString() === userId.toString();
    const isSeller = order.seller.toString() === userId.toString();

    // --- KIỂM TRA LOGIC VÀ QUYỀN HẠN ---

    // A. Hủy đơn: Trả bài đăng về trạng thái "active"
    if (status === "cancelled") {
      if (!cancelReason)
        return res
          .status(400)
          .json({ success: false, message: "Vui lòng cung cấp lý do hủy" });
      if (!isBuyer && !isSeller)
        return res
          .status(403)
          .json({ success: false, message: "Không có quyền" });

      if (order.status === "shipped" || order.status === "delivered") {
        return res.status(400).json({
          success: false,
          message: "Không thể hủy đơn hàng khi đã giao hoặc hoàn thành",
        });
      }

      order.notes = `Hủy bởi ${isBuyer ? "Người mua" : "Người bán"}: ${cancelReason}`;

      // Quan trọng: Trả hàng về lại sàn
      await Post.findByIdAndUpdate(order.product, { status: "active" });
      if (order.paymentStatus === "paid") {
        await refund({
          buyerId: order.buyer,
          amount: order.totalAmount,
          orderId: order._id,
        });
      }
      await createNotification({
        receiver: isBuyer ? order.seller : order.buyer,
        sender: userId,
        type: "ORDER",
        title: "Đơn hàng đã bị hủy",
        content: `Đơn hàng cho sản phẩm ${order._id} đã bị hủy bởi ${isBuyer ? "người mua" : "người bán"}.${order.paymentStatus === "paid" ? " Tiền đã được hoàn lại" : ""}`,
        link: isBuyer ? "/my-orders?tab=selling" : "/my-orders?tab=buying",
      });
      order.paymentStatus = "failed";
    }

    // B. Người bán xác nhận (Pending -> Processing)
    else if (status === "processing") {
      if (!isSeller)
        return res.status(403).json({
          success: false,
          message: "Chỉ người bán mới có quyền xác nhận đơn",
        });
      if (order.status !== "pending")
        return res.status(400).json({
          success: false,
          message: "Đơn hàng phải ở trạng thái chờ xác nhận",
        });

      // Post đã được ẩn từ lúc createOrder nên không cần update thêm ở đây
    }

    // C. Người bán bắt đầu giao (Processing -> Shipped)
    else if (status === "shipped") {
      if (!isSeller)
        return res.status(403).json({
          success: false,
          message: "Chỉ người bán mới có thể chuyển sang đang giao",
        });
      if (order.status !== "processing")
        return res.status(400).json({
          success: false,
          message: "Phải xác nhận đơn trước khi giao",
        });
    }

    // D. Người mua xác nhận đã nhận (Shipped -> Delivered)
    else if (status === "delivered") {
      if (!isBuyer)
        return res.status(403).json({
          success: false,
          message: "Chỉ người mua mới có thể xác nhận đã nhận hàng",
        });
      if (order.status !== "shipped")
        return res
          .status(400)
          .json({ success: false, message: "Đơn hàng chưa được giao đến bạn" });

      // Giao dịch thành công: Chuyển Post sang "sold"
      await settleSeller({
        sellerId: order.seller,
        amount: order.totalAmount,
        orderId: order._id,
        paymentMethod: order.paymentMethod,
      });
      await Post.findByIdAndUpdate(order.product, {
        status: "sold",
      });
      order.paymentStatus = "paid";
    }

    order.status = status;
    await order.save();

    res.json({
      success: true,
      message: `Cập nhật trạng thái thành: ${status}`,
      data: order,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
