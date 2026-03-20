"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMyHistory = exports.trackViewHistory = void 0;
const history_model_1 = __importDefault(require("../models/history.model"));
const trackViewHistory = async (userId, postId) => {
    await history_model_1.default.findOneAndUpdate({ user: userId, post: postId }, { updatedAt: new Date() }, { upsert: true });
};
exports.trackViewHistory = trackViewHistory;
const getMyHistory = async (req, res) => {
    const history = await history_model_1.default.find({ user: req.user._id })
        .populate("post")
        .sort({ updatedAt: -1 })
        .limit(50);
    res.status(200).json({ data: history });
};
exports.getMyHistory = getMyHistory;
