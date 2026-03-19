import { AuthRequest } from "../middleware/auth.middleware";
import { Response } from "express";
import Review from "../models/review.model";

export const createReview = async (req: AuthRequest, res: Response) => {
  const { targetUserId, rating, comment, postId } = req.body;

  const newReview = await Review.create({
    reviewer: req.user!._id,
    receiver: targetUserId,
    post: postId,
    rating,
    comment,
  });

  res.status(201).json({ data: newReview });
};

export const getMySentReviews = async (req: AuthRequest, res: Response) => {
  const reviews = await Review.find({ reviewer: req.user!._id })
    .populate("receiver", "name avatar")
    .populate("post", "title images")
    .sort({ createdAt: -1 });

  res.status(200).json({ data: reviews });
};
