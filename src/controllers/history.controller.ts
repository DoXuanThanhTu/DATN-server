import { Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware";
import History from "../models/history.model";
export const trackViewHistory = async (userId: string, postId: string) => {
  await History.findOneAndUpdate(
    { user: userId, post: postId },
    { updatedAt: new Date() },
    { upsert: true },
  );
};

export const getMyHistory = async (req: AuthRequest, res: Response) => {
  const history = await History.find({ user: req.user!._id })
    .populate("post")
    .sort({ updatedAt: -1 })
    .limit(50);
  res.status(200).json({ data: history });
};
