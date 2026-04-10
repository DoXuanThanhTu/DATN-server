import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import User from "../models/user.model";

const signToken = (id: string): string => {
  const secret = process.env.JWT_SECRET;
  const expiresInEnv = process.env.JWT_EXPIRES_IN;

  if (!secret) {
    console.error("JWT_SECRET chưa được cấu hình trong file .env");
    return "";
  }

  return jwt.sign({ id }, secret, {
    expiresIn: (expiresInEnv || "7d") as any,
  });
};

export const register = async (req: Request, res: Response) => {
  try {
    const { name, email, password, role } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email đã tồn tại" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = await User.create({
      name,
      email,
      password: hashedPassword,
      role,
    });

    const token = signToken(newUser._id.toString());
    res.status(201).json({
      status: "success",
      token,
      data: {
        user: { id: newUser._id, name: newUser.name, role: newUser.role },
      },
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res
        .status(401)
        .json({ message: "Email hoặc mật khẩu không chính xác" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res
        .status(401)
        .json({ message: "Email hoặc mật khẩu không chính xác" });
    }

    const token = signToken(user._id.toString());
    res.status(200).json({
      status: "success",
      token,
      data: {
        user: {
          id: user._id,
          name: user.name,
          role: user.role,
          avatar: user.avatar || "",
          address: user.address || null,
          phone: user.phone || "",
        },
      },
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};
