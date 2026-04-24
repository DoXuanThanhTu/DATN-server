import { Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware";
import Wallet from "../models/wallet.model";
import Ledger from "../models/ledger.model";

export const getMyWalletWithLedger = async (
  req: AuthRequest,
  res: Response,
) => {
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
    let wallet = await Wallet.findOne({ user: userId });

    if (!wallet) {
      wallet = await Wallet.create({
        user: userId,
        availableBalance: 0,
        pendingBalance: 0,
      });
    }

    // =========================
    // 2. LEDGER PAGINATION
    // =========================
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const query = {
      $or: [{ fromUser: userId }, { toUser: userId }],
    };

    const [ledgers, total] = await Promise.all([
      Ledger.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Ledger.countDocuments(query),
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
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};
