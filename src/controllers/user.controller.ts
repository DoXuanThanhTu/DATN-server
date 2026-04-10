import { Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware";
import User from "../models/user.model";

// Lấy thông tin cá nhân của người dùng hiện tại
export const getMe = async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.user?._id).select("-password");
    if (!user) {
      return res.status(404).json({ message: "Người dùng không tồn tại" });
    }
    res.status(200).json({ data: user });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server" });
  }
};

// Cập nhật thông tin hồ sơ
export const updateProfile = async (req: AuthRequest, res: Response) => {
  try {
    const { name, phone, gender, address, avatar } = req.body;

    // Chuẩn bị object address khớp với IUser Model
    const addressUpdate = {
      provinceName: address?.provinceName || "",
      provinceCode: address?.provinceCode || "",
      wardName: address?.wardName || "",
      wardCode: address?.wardCode || "",
      detail: address?.detail || "",
      // Tự động tạo fullAddress nếu cần (tiện cho việc hiển thị sau này)
      fullAddress: [address?.detail, address?.wardName, address?.provinceName]
        .filter(Boolean)
        .join(", "),
    };

    const updatedUser = await User.findByIdAndUpdate(
      req.user?._id,
      {
        $set: {
          name,
          phone,
          gender,
          address: addressUpdate,
          avatar,
          lastActive: new Date(),
        },
      },
      {
        returnDocument: "after", // Trả về data sau khi update
        runValidators: true, // Chạy validation của schema
      },
    ).select("-password");

    if (!updatedUser) {
      return res.status(404).json({ message: "Không tìm thấy người dùng" });
    }

    res.status(200).json({
      message: "Cập nhật hồ sơ thành công",
      data: updatedUser,
    });
  } catch (error: any) {
    console.error("Update Profile Error:", error);
    res.status(500).json({
      message: "Lỗi cập nhật hồ sơ",
      error: error.message,
    });
  }
};

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
