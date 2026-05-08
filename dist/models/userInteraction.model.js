"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const userInteractionSchema = new mongoose_1.default.Schema({
    user: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
    },
    /**
     * Post có thể null
     * vì search không gắn với post cụ thể
     */
    post: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: "Post",
        default: null,
        index: true,
    },
    /**
     * SEARCH KEYWORD
     */
    keyword: {
        type: String,
        default: null,
        trim: true,
        index: true,
    },
    normalizedKeyword: {
        type: String,
        default: null,
        index: true,
    },
    type: {
        type: String,
        enum: ["view", "like", "save", "chat", "purchase", "search"],
        required: true,
        index: true,
    },
    score: {
        type: Number,
        default: 1,
    },
}, {
    timestamps: true,
});
exports.default = mongoose_1.default.model("UserInteraction", userInteractionSchema);
