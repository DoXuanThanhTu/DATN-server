"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateReview = exports.getMyReviews = exports.getUserReviews = exports.createReview = void 0;
const review_model_1 = __importDefault(require("../models/review.model"));
const order_model_1 = __importDefault(require("../models/order.model"));
const user_model_1 = __importDefault(require("../models/user.model"));
const mongoose_1 = __importDefault(require("mongoose"));
/**
 * @desc    Tạo đánh giá mới cho đơn hàng
 * @route   POST /api/v1/reviews
 */
const createReview = async (req, res) => {
    try {
        const { orderId, revieweeId, rating, comment, type } = req.body;
        const reviewerId = req.user?._id;
        if (!reviewerId) {
            return res.status(401).json({ message: "Bạn cần đăng nhập để đánh giá" });
        }
        // 1. Kiểm tra đơn hàng tồn tại
        const order = await order_model_1.default.findById(orderId);
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
        }
        else if (type === "SELLER_TO_BUYER") {
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
        }
        else {
            return res
                .status(400)
                .json({ message: "Loại đánh giá (type) không hợp lệ" });
        }
        // 4. Tạo đánh giá trong Database
        const newReview = await review_model_1.default.create({
            order: orderId,
            reviewer: reviewerId,
            reviewee: revieweeId,
            rating,
            comment,
            type,
        });
        // 5. Cập nhật Rating trung bình vào User Profile bằng Aggregate
        const stats = await review_model_1.default.aggregate([
            { $match: { reviewee: new mongoose_1.default.Types.ObjectId(revieweeId) } },
            {
                $group: {
                    _id: "$reviewee",
                    avgRating: { $avg: "$rating" },
                    count: { $sum: 1 },
                },
            },
        ]);
        if (stats.length > 0) {
            await user_model_1.default.findByIdAndUpdate(revieweeId, {
                ratingAverage: Math.round(stats[0].avgRating * 10) / 10,
                ratingCount: stats[0].count,
            });
        }
        res.status(201).json({
            status: "success",
            message: "Cảm ơn bạn đã để lại đánh giá!",
            data: newReview,
        });
    }
    catch (error) {
        if (error.code === 11000) {
            return res
                .status(400)
                .json({ message: "Bạn đã đánh giá giao dịch này rồi" });
        }
        res.status(500).json({ message: error.message });
    }
};
exports.createReview = createReview;
/**
 * @desc    Lấy danh sách đánh giá của một User bất kỳ (xem profile người khác)
 * @route   GET /api/v1/reviews/user/:userId
 */
const getUserReviews = async (req, res) => {
    try {
        const { userId } = req.params;
        const { type } = req.query; // Có thể lọc theo ?type=BUYER_TO_SELLER hoặc SELLER_TO_BUYER
        let query = { reviewee: userId };
        if (type)
            query.type = type;
        const reviews = await review_model_1.default.find(query)
            .populate("reviewer", "name avatar")
            .sort("-createdAt");
        res.status(200).json({
            status: "success",
            results: reviews.length,
            data: reviews,
        });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.getUserReviews = getUserReviews;
/**
 * @desc    Lấy danh sách đánh giá của CHÍNH TÔI (dùng cho trang Profile cá nhân)
 * @route   GET /api/v1/reviews/me
 */
const getMyReviews = async (req, res) => {
    const userId = req.user?._id;
    const { tab } = req.query;
    let query = {};
    if (tab === "fromBuyers") {
        // Người khác mua hàng của tôi -> Tôi là Seller, họ gửi đánh giá BUYER_TO_SELLER
        query = { reviewee: userId, type: "BUYER_TO_SELLER" };
    }
    else if (tab === "fromSellers") {
        // Tôi đi mua đồ của người khác -> Tôi là Buyer, họ gửi đánh giá SELLER_TO_BUYER
        query = { reviewee: userId, type: "SELLER_TO_BUYER" };
    }
    else if (tab === "myReviews") {
        // Tất cả những gì TÔI đi đánh giá người khác
        query = { reviewer: userId };
    }
    const reviews = await review_model_1.default.find(query)
        .populate("reviewer", "name avatar")
        .populate("reviewee", "name avatar")
        .sort("-createdAt");
    res.status(200).json({ data: reviews });
};
exports.getMyReviews = getMyReviews;
const updateReview = async (req, res) => {
    try {
        const { reviewId } = req.params;
        const { rating, comment } = req.body;
        const userId = req.user?._id;
        // 1. Tìm đánh giá và kiểm tra quyền sở hữu
        const review = await review_model_1.default.findById(reviewId);
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
        const stats = await review_model_1.default.aggregate([
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
            await user_model_1.default.findByIdAndUpdate(review.reviewee, {
                ratingAverage: Math.round(stats[0].avgRating * 10) / 10,
                ratingCount: stats[0].count,
            });
        }
        res.status(200).json({
            status: "success",
            message: "Cập nhật đánh giá thành công",
            data: review,
        });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.updateReview = updateReview;
