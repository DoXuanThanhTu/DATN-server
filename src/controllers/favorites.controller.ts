import { AuthRequest } from "../middleware/auth.middleware";
import Favorite from "../models/favorite.model";
import { Response } from "express";

export const toggleFavorite = async (req: AuthRequest, res: Response) => {
  const { postId } = req.params;

  const userId = req.user!._id;

  const existing = await Favorite.findOne({ user: userId, post: postId });

  if (existing) {
    const deleted = await Favorite.deleteOne({ _id: existing._id });
    return res.status(200).json({ message: "Đã bỏ lưu tin", success: deleted.deletedCount > 0 });
  }

  const created = await Favorite.create({ user: userId, post: postId });
  res.status(201).json({ message: "Đã lưu tin thành công", success: created._id !== undefined, data: created });
};

export const getMyFavorites = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: "Unauthorized", success: false });
  }
  const favorites = await Favorite.find({ user: req.user._id })
    .populate("post")
    .sort({ createdAt: -1 });
  res.status(200).json({ data: favorites, success: true });
};
