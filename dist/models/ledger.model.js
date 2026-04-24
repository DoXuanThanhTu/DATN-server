"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const LedgerSchema = new mongoose_1.default.Schema({
    fromWallet: { type: mongoose_1.default.Schema.Types.ObjectId, ref: "Wallet" },
    toWallet: { type: mongoose_1.default.Schema.Types.ObjectId, ref: "Wallet" },
    fromUser: mongoose_1.default.Schema.Types.Mixed,
    toUser: mongoose_1.default.Schema.Types.Mixed,
    orderId: { type: mongoose_1.default.Schema.Types.ObjectId },
    amount: { type: Number, required: true },
    type: {
        type: String,
        enum: ["DEBIT", "CREDIT"],
        required: true,
    },
    status: {
        type: String,
        enum: ["PENDING", "SETTLED", "REVERSED"],
        default: "PENDING",
    },
    transactionType: {
        type: String,
        enum: [
            "ORDER_PAYMENT",
            "ESCROW_HOLD",
            "SELLER_PENDING",
            "SETTLEMENT",
            "FEE",
            "REFUND",
            "COD_IN",
            "COD_OUT",
            "WITHDRAW",
        ],
    },
    referenceId: { type: String, unique: true }, // idempotency
    metadata: { type: Object },
}, { timestamps: true });
exports.default = mongoose_1.default.model("Ledger", LedgerSchema);
