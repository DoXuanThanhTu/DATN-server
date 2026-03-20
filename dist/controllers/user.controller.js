"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllUsers = exports.updateStatus = void 0;
const user_model_1 = __importDefault(require("../models/user.model"));
const updateStatus = async (req, res) => {
    try {
        await user_model_1.default.findByIdAndUpdate(req.user._id, {
            lastActive: new Date(),
        });
        res.sendStatus(200);
    }
    catch (error) {
        res.sendStatus(500);
    }
};
exports.updateStatus = updateStatus;
const getAllUsers = async (req, res) => {
    try {
        const loggedInUserId = req.user?._id;
        const filteredUsers = await user_model_1.default.find({ _id: { $ne: loggedInUserId } })
            .select("-password")
            .sort({ createdAt: -1 });
        res.status(200).json(filteredUsers);
    }
    catch (error) {
        res.status(500).json({ message: "Lỗi lấy danh sách người dùng" });
    }
};
exports.getAllUsers = getAllUsers;
