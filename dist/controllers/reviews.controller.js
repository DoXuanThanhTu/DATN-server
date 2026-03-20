"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMySentReviews = exports.createReview = void 0;
const review_model_1 = __importDefault(require("../models/review.model"));
const createReview = async (req, res) => {
    const { targetUserId, rating, comment, postId } = req.body;
    const newReview = await review_model_1.default.create({
        reviewer: req.user._id,
        receiver: targetUserId,
        post: postId,
        rating,
        comment,
    });
    res.status(201).json({ data: newReview });
};
exports.createReview = createReview;
const getMySentReviews = async (req, res) => {
    const reviews = await review_model_1.default.find({ reviewer: req.user._id })
        .populate("receiver", "name avatar")
        .populate("post", "title images")
        .sort({ createdAt: -1 });
    res.status(200).json({ data: reviews });
};
exports.getMySentReviews = getMySentReviews;
