"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.login = exports.register = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const user_model_1 = __importDefault(require("../models/user.model"));
const signToken = (id) => {
    const secret = process.env.JWT_SECRET;
    const expiresInEnv = process.env.JWT_EXPIRES_IN;
    if (!secret) {
        console.error("JWT_SECRET chưa được cấu hình trong file .env");
        return "";
    }
    return jsonwebtoken_1.default.sign({ id }, secret, {
        expiresIn: (expiresInEnv || "7d"),
    });
};
const register = async (req, res) => {
    try {
        const { name, email, password, role } = req.body;
        const existingUser = await user_model_1.default.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: "Email đã tồn tại" });
        }
        const salt = await bcryptjs_1.default.genSalt(10);
        const hashedPassword = await bcryptjs_1.default.hash(password, salt);
        const newUser = await user_model_1.default.create({
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
    }
    catch (err) {
        res.status(500).json({ message: err.message });
    }
};
exports.register = register;
const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await user_model_1.default.findOne({ email });
        if (!user) {
            return res
                .status(401)
                .json({ message: "Email hoặc mật khẩu không chính xác" });
        }
        const isMatch = await bcryptjs_1.default.compare(password, user.password);
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
                },
            },
        });
    }
    catch (err) {
        res.status(500).json({ message: err.message });
    }
};
exports.login = login;
