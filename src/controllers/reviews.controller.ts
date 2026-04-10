import { Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware";
import Review from "../models/review.model";
import Order from "../models/order.model";
import User from "../models/user.model";
import mongoose from "mongoose";

/**
 * @desc    Tạo đánh giá mới cho đơn hàng
 * @route   POST /api/v1/reviews
 */
export const createReview = async (req: AuthRequest, res: Response) => {
  try {
    const { orderId, revieweeId, rating, comment, type } = req.body;
    const reviewerId = req.user?._id;

    if (!reviewerId) {
      return res.status(401).json({ message: "Bạn cần đăng nhập để đánh giá" });
    }

    // 1. Kiểm tra đơn hàng tồn tại
    const order = await Order.findById(orderId);
    if (!order) {
      return res
        .status(404)
        .json({ message: "Không tìm thấy đơn hàng liên quan" });
    }

    // 2. Chỉ đánh giá khi đã giao hàng thành công
    if (order.status !== "delivered") {
      return res.status(400).json({
        message: "Chỉ có thể đánh giá sau khi đơn hàng đã được giao thành công",
      });
    }

    // 3. Kiểm tra vai trò (Authorization)
    if (type === "BUYER_TO_SELLER") {
      if (order.buyer.toString() !== reviewerId.toString()) {
        return res
          .status(403)
          .json({ message: "Chỉ người mua mới có quyền đánh giá người bán" });
      }
      if (order.seller.toString() !== revieweeId) {
        return res
          .status(400)
          .json({ message: "Người nhận không phải người bán của đơn này" });
      }
    } else if (type === "SELLER_TO_BUYER") {
      if (order.seller.toString() !== reviewerId.toString()) {
        return res
          .status(403)
          .json({ message: "Chỉ người bán mới có quyền đánh giá người mua" });
      }
      if (order.buyer.toString() !== revieweeId) {
        return res
          .status(400)
          .json({ message: "Người nhận không phải người mua của đơn này" });
      }
    } else {
      return res
        .status(400)
        .json({ message: "Loại đánh giá (type) không hợp lệ" });
    }

    // 4. Tạo đánh giá trong Database
    const newReview = await Review.create({
      order: orderId,
      reviewer: reviewerId,
      reviewee: revieweeId,
      rating,
      comment,
      type,
    });

    // 5. Cập nhật Rating trung bình vào User Profile bằng Aggregate
    const stats = await Review.aggregate([
      { $match: { reviewee: new mongoose.Types.ObjectId(revieweeId) } },
      {
        $group: {
          _id: "$reviewee",
          avgRating: { $avg: "$rating" },
          count: { $sum: 1 },
        },
      },
    ]);

    if (stats.length > 0) {
      await User.findByIdAndUpdate(revieweeId, {
        ratingAverage: Math.round(stats[0].avgRating * 10) / 10,
        ratingCount: stats[0].count,
      });
    }

    res.status(201).json({
      status: "success",
      message: "Cảm ơn bạn đã để lại đánh giá!",
      data: newReview,
    });
  } catch (error: any) {
    if (error.code === 11000) {
      return res
        .status(400)
        .json({ message: "Bạn đã đánh giá giao dịch này rồi" });
    }
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc    Lấy danh sách đánh giá của một User bất kỳ (xem profile người khác)
 * @route   GET /api/v1/reviews/user/:userId
 */
export const getUserReviews = async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params;
    const { type } = req.query; // Có thể lọc theo ?type=BUYER_TO_SELLER hoặc SELLER_TO_BUYER

    let query: any = { reviewee: userId };
    if (type) query.type = type;

    const reviews = await Review.find(query)
      .populate("reviewer", "name avatar")
      .sort("-createdAt");

    res.status(200).json({
      status: "success",
      results: reviews.length,
      data: reviews,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc    Lấy danh sách đánh giá của CHÍNH TÔI (dùng cho trang Profile cá nhân)
 * @route   GET /api/v1/reviews/me
 */
export const getMyReviews = async (req: AuthRequest, res: Response) => {
  const userId = req.user?._id;
  const { tab } = req.query;

  let query = {};
  if (tab === "fromBuyers") {
    // Người khác mua hàng của tôi -> Tôi là Seller, họ gửi đánh giá BUYER_TO_SELLER
    query = { reviewee: userId, type: "BUYER_TO_SELLER" };
  } else if (tab === "fromSellers") {
    // Tôi đi mua đồ của người khác -> Tôi là Buyer, họ gửi đánh giá SELLER_TO_BUYER
    query = { reviewee: userId, type: "SELLER_TO_BUYER" };
  } else if (tab === "myReviews") {
    // Tất cả những gì TÔI đi đánh giá người khác
    query = { reviewer: userId };
  }

  const reviews = await Review.find(query)
    .populate("reviewer", "name avatar")
    .populate("reviewee", "name avatar")
    .sort("-createdAt");

  res.status(200).json({ data: reviews });
};
export const updateReview = async (req: AuthRequest, res: Response) => {
  try {
    const { reviewId } = req.params;
    const { rating, comment } = req.body;
    const userId = req.user?._id;

    // 1. Tìm đánh giá và kiểm tra quyền sở hữu
    const review = await Review.findById(reviewId);

    if (!review) {
      return res.status(404).json({ message: "Không tìm thấy đánh giá" });
    }

    if (review.reviewer.toString() !== userId?.toString()) {
      return res
        .status(403)
        .json({ message: "Bạn không có quyền chỉnh sửa đánh giá này" });
    }

    // 2. Cập nhật nội dung
    review.rating = rating || review.rating;
    review.comment = comment || review.comment;
    await review.save();

    // 3. Tính toán lại Rating trung bình cho người nhận đánh giá (Reviewee)
    const stats = await Review.aggregate([
      { $match: { reviewee: review.reviewee } },
      {
        $group: {
          _id: "$reviewee",
          avgRating: { $avg: "$rating" },
          count: { $sum: 1 },
        },
      },
    ]);

    if (stats.length > 0) {
      await User.findByIdAndUpdate(review.reviewee, {
        ratingAverage: Math.round(stats[0].avgRating * 10) / 10,
        ratingCount: stats[0].count,
      });
    }

    res.status(200).json({
      status: "success",
      message: "Cập nhật đánh giá thành công",
      data: review,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
