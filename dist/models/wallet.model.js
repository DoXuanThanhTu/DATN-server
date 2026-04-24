"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const WalletSchema = new mongoose_1.default.Schema({
    user: {
        type: mongoose_1.default.Schema.Types.Mixed,
        required: true,
        index: true,
    },
    availableBalance: { type: Number, default: 0 },
    pendingBalance: { type: Number, default: 0 },
    frozenBalance: { type: Number, default: 0 },
    currency: { type: String, default: "VND" },
}, { timestamps: true });
exports.default = mongoose_1.default.model("Wallet", WalletSchema);
