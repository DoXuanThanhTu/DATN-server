"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMyWalletWithLedger = void 0;
const wallet_model_1 = __importDefault(require("../models/wallet.model"));
const ledger_model_1 = __importDefault(require("../models/ledger.model"));
const getMyWalletWithLedger = async (req, res) => {
    try {
        const userId = req.user?._id;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
        }
        // =========================
        // 1. WALLET
        // =========================
        let wallet = await wallet_model_1.default.findOne({ user: userId });
        if (!wallet) {
            wallet = await wallet_model_1.default.create({
                user: userId,
                availableBalance: 0,
                pendingBalance: 0,
            });
        }
        // =========================
        // 2. LEDGER PAGINATION
        // =========================
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        const query = {
            $or: [{ fromUser: userId }, { toUser: userId }],
        };
        const [ledgers, total] = await Promise.all([
            ledger_model_1.default.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
            ledger_model_1.default.countDocuments(query),
        ]);
        // =========================
        // 3. RESPONSE (Shopee style)
        // =========================
        return res.json({
            success: true,
            data: {
                wallet: {
                    availableBalance: wallet.availableBalance,
                    pendingBalance: wallet.pendingBalance,
                },
                ledger: {
                    items: ledgers,
                    pagination: {
                        total,
                        page,
                        limit,
                        totalPages: Math.ceil(total / limit),
                    },
                },
            },
        });
    }
    catch (err) {
        return res.status(500).json({
            success: false,
            message: err.message,
        });
    }
};
exports.getMyWalletWithLedger = getMyWalletWithLedger;
