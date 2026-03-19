import { Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware";
import User from "../models/user.model";

export const updateStatus = async (req: AuthRequest, res: Response) => {
  try {
    await User.findByIdAndUpdate(req.user!._id, {
      lastActive: new Date(),
    });
    res.sendStatus(200);
  } catch (error) {
    res.sendStatus(500);
  }
};
export const getAllUsers = async (req: AuthRequest, res: Response) => {
  try {
    const loggedInUserId = req.user?._id;
    const filteredUsers = await User.find({ _id: { $ne: loggedInUserId } })
      .select("-password")
      .sort({ createdAt: -1 });

    res.status(200).json(filteredUsers);
  } catch (error) {
    res.status(500).json({ message: "Lỗi lấy danh sách người dùng" });
  }
};
