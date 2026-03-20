"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMyFavorites = exports.toggleFavorite = void 0;
const favorite_model_1 = __importDefault(require("../models/favorite.model"));
const toggleFavorite = async (req, res) => {
    const { postId } = req.params;
    const userId = req.user._id;
    const existing = await favorite_model_1.default.findOne({ user: userId, post: postId });
    if (existing) {
        await favorite_model_1.default.deleteOne({ _id: existing._id });
        return res.status(200).json({ message: "Đã bỏ lưu tin" });
    }
    await favorite_model_1.default.create({ user: userId, post: postId });
    res.status(201).json({ message: "Đã lưu tin thành công" });
};
exports.toggleFavorite = toggleFavorite;
const getMyFavorites = async (req, res) => {
    const favorites = await favorite_model_1.default.find({ user: req.user._id })
        .populate("post")
        .sort({ createdAt: -1 });
    res.status(200).json({ data: favorites });
};
exports.getMyFavorites = getMyFavorites;
