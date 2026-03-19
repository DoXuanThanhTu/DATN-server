import { AuthRequest } from "../middleware/auth.middleware";
import Favorite from "../models/favorite.model";
import { Response } from "express";

export const toggleFavorite = async (req: AuthRequest, res: Response) => {
  const { postId } = req.params;

  const userId = req.user!._id;

  const existing = await Favorite.findOne({ user: userId, post: postId });

  if (existing) {
    await Favorite.deleteOne({ _id: existing._id });
    return res.status(200).json({ message: "Đã bỏ lưu tin" });
  }

  await Favorite.create({ user: userId, post: postId });
  res.status(201).json({ message: "Đã lưu tin thành công" });
};

export const getMyFavorites = async (req: AuthRequest, res: Response) => {
  const favorites = await Favorite.find({ user: req.user!._id })
    .populate("post")
    .sort({ createdAt: -1 });
  res.status(200).json({ data: favorites });
};
