import { AuthRequest } from "src/middleware/auth.middleware";
import Ledger from "../models/ledger.model";
import Wallet from "../models/wallet.model";
import { Response } from "express";
export const transfer = async ({
  from,
  to,
  amount,
  orderId,
  type,
  referenceId,
}: any) => {
  const fromWallet = await Wallet.findOne({ user: from });
  const toWallet = await Wallet.findOne({ user: to });

  if (!fromWallet || !toWallet) throw new Error("Wallet not found");

  // DEBIT
  await Ledger.create({
    fromWallet: fromWallet._id,
    toWallet: toWallet._id,
    fromUser: from,
    toUser: to,
    amount,
    type: "DEBIT",
    orderId,
    transactionType: type,
    referenceId: referenceId + "_D",
  });

  // CREDIT
  await Ledger.create({
    fromWallet: fromWallet._id,
    toWallet: toWallet._id,
    fromUser: from,
    toUser: to,
    amount,
    type: "CREDIT",
    orderId,
    transactionType: type,
    referenceId: referenceId + "_C",
  });

  return { fromWallet, toWallet };
};
export const holdPayment = async ({ buyerId, amount, orderId }: any) => {
  const buyer = await Wallet.findOne({ user: buyerId });
  const platform = await Wallet.findOne({ user: "PLATFORM" });

  if (!buyer || !platform) throw new Error("Wallet not found");

  // buyer mất tiền khả dụng
  // buyer.availableBalance -= amount;
  // buyer.pendingBalance += amount;

  await buyer.save();

  // platform giữ escrow
  platform.pendingBalance += amount;

  await platform.save();

  await Ledger.create({
    fromUser: buyerId,
    toUser: "PLATFORM",
    amount,
    type: "DEBIT",
    transactionType: "ESCROW_HOLD",
    orderId,
    referenceId: orderId + "_H",
  });
};
export const refund = async ({ buyerId, amount, orderId }: any) => {
  const buyer = await Wallet.findOne({ user: buyerId });
  const platform = await Wallet.findOne({ user: "PLATFORM" });

  if (!buyer || !platform) throw new Error("Wallet not found");

  platform.pendingBalance -= amount;
  // buyer.pendingBalance -= amount;
  buyer.availableBalance += amount;

  await platform.save();
  await buyer.save();

  await Ledger.create({
    fromUser: "PLATFORM",
    toUser: buyerId,
    amount,
    type: "CREDIT",
    transactionType: "REFUND",
    orderId,
    referenceId: orderId + "_R",
  });
};
export const moveToSeller = async ({
  sellerId,
  amount,
  orderId,
  paymentMethod,
}: any) => {
  const seller = await Wallet.findOne({ user: sellerId });
  const platform = await Wallet.findOne({ user: "PLATFORM" });

  if (!seller || !platform) throw new Error("Wallet not found");
  if (paymentMethod === "vnpay") {
    platform.availableBalance += amount;
    seller.pendingBalance += amount;
  }

  await platform.save();
  await seller.save();

  await Ledger.create({
    fromUser: "PLATFORM",
    toUser: sellerId,
    amount,
    type: "CREDIT",
    transactionType: "SELLER_PENDING",
    orderId,
    referenceId: orderId + "_S",
  });
};
export const settleSeller = async ({
  sellerId,
  amount,
  orderId,
  paymentMethod,
}: any) => {
  const seller = await Wallet.findOne({ user: sellerId });
  const platform = await Wallet.findOne({ user: "PLATFORM" });

  if (!seller || !platform) throw new Error("Wallet not found");

  if (paymentMethod === "vnpay") {
    seller.pendingBalance -= amount;
    seller.availableBalance += amount;
    platform.availableBalance -= amount;
  } else {
    seller.availableBalance += amount;
  }

  await seller.save();

  await Ledger.create({
    fromUser: "PLATFORM",
    toUser: sellerId,
    amount,
    type: "CREDIT",
    transactionType: "SETTLEMENT",
    orderId,
    referenceId: orderId + "_ST",
  });
};
export const codCollected = async ({ orderId, amount }: any) => {
  const platform = await Wallet.findOne({ user: "PLATFORM" });

  if (!platform) throw new Error("Wallet not found");

  platform.availableBalance += amount;

  await platform.save();

  await Ledger.create({
    fromUser: "SHIPPER",
    toUser: "PLATFORM",
    amount,
    type: "CREDIT",
    transactionType: "COD_IN",
    orderId,
    referenceId: orderId + "_COD",
  });
};
export const payoutSellerCOD = async ({ sellerId, amount, orderId }: any) => {
  const seller = await Wallet.findOne({ user: sellerId });
  const platform = await Wallet.findOne({ user: "PLATFORM" });

  if (!seller || !platform) throw new Error("Wallet not found");

  seller.availableBalance += amount;
  platform.availableBalance -= amount;

  await seller.save();

  await Ledger.create({
    fromUser: "PLATFORM",
    toUser: sellerId,
    amount,
    type: "CREDIT",
    transactionType: "COD_OUT",
    orderId,
    referenceId: orderId + "_COD_OUT",
  });
};
export const getMyLedger = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;

    const ledgers = await Ledger.find({
      $or: [{ fromUser: userId }, { toUser: userId }],
    })
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({
      success: true,
      data: ledgers,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getAllLedger = async (req: AuthRequest, res: Response) => {
  try {
    const data = await Ledger.find().sort({ createdAt: -1 }).limit(200);

    res.json({
      success: true,
      data,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const createLedger = async (req: AuthRequest, res: Response) => {
  try {
    const ledger = await Ledger.create(req.body);

    res.json({
      success: true,
      data: ledger,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};
