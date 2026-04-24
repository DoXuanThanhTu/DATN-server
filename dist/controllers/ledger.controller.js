"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createLedger = exports.getAllLedger = exports.getMyLedger = exports.payoutSellerCOD = exports.codCollected = exports.settleSeller = exports.moveToSeller = exports.refund = exports.holdPayment = exports.transfer = void 0;
const ledger_model_1 = __importDefault(require("../models/ledger.model"));
const wallet_model_1 = __importDefault(require("../models/wallet.model"));
const transfer = async ({ from, to, amount, orderId, type, referenceId, }) => {
    const fromWallet = await wallet_model_1.default.findOne({ user: from });
    const toWallet = await wallet_model_1.default.findOne({ user: to });
    if (!fromWallet || !toWallet)
        throw new Error("Wallet not found");
    // DEBIT
    await ledger_model_1.default.create({
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
    await ledger_model_1.default.create({
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
exports.transfer = transfer;
const holdPayment = async ({ buyerId, amount, orderId }) => {
    const buyer = await wallet_model_1.default.findOne({ user: buyerId });
    const platform = await wallet_model_1.default.findOne({ user: "PLATFORM" });
    if (!buyer || !platform)
        throw new Error("Wallet not found");
    // buyer mất tiền khả dụng
    // buyer.availableBalance -= amount;
    // buyer.pendingBalance += amount;
    await buyer.save();
    // platform giữ escrow
    platform.pendingBalance += amount;
    await platform.save();
    await ledger_model_1.default.create({
        fromUser: buyerId,
        toUser: "PLATFORM",
        amount,
        type: "DEBIT",
        transactionType: "ESCROW_HOLD",
        orderId,
        referenceId: orderId + "_H",
    });
};
exports.holdPayment = holdPayment;
const refund = async ({ buyerId, amount, orderId }) => {
    const buyer = await wallet_model_1.default.findOne({ user: buyerId });
    const platform = await wallet_model_1.default.findOne({ user: "PLATFORM" });
    if (!buyer || !platform)
        throw new Error("Wallet not found");
    platform.pendingBalance -= amount;
    // buyer.pendingBalance -= amount;
    buyer.availableBalance += amount;
    await platform.save();
    await buyer.save();
    await ledger_model_1.default.create({
        fromUser: "PLATFORM",
        toUser: buyerId,
        amount,
        type: "CREDIT",
        transactionType: "REFUND",
        orderId,
        referenceId: orderId + "_R",
    });
};
exports.refund = refund;
const moveToSeller = async ({ sellerId, amount, orderId, paymentMethod, }) => {
    const seller = await wallet_model_1.default.findOne({ user: sellerId });
    const platform = await wallet_model_1.default.findOne({ user: "PLATFORM" });
    if (!seller || !platform)
        throw new Error("Wallet not found");
    if (paymentMethod === "vnpay") {
        platform.availableBalance += amount;
        seller.pendingBalance += amount;
    }
    await platform.save();
    await seller.save();
    await ledger_model_1.default.create({
        fromUser: "PLATFORM",
        toUser: sellerId,
        amount,
        type: "CREDIT",
        transactionType: "SELLER_PENDING",
        orderId,
        referenceId: orderId + "_S",
    });
};
exports.moveToSeller = moveToSeller;
const settleSeller = async ({ sellerId, amount, orderId, paymentMethod, }) => {
    const seller = await wallet_model_1.default.findOne({ user: sellerId });
    const platform = await wallet_model_1.default.findOne({ user: "PLATFORM" });
    if (!seller || !platform)
        throw new Error("Wallet not found");
    if (paymentMethod === "vnpay") {
        seller.pendingBalance -= amount;
        seller.availableBalance += amount;
        platform.availableBalance -= amount;
    }
    else {
        seller.availableBalance += amount;
    }
    await seller.save();
    await ledger_model_1.default.create({
        fromUser: "PLATFORM",
        toUser: sellerId,
        amount,
        type: "CREDIT",
        transactionType: "SETTLEMENT",
        orderId,
        referenceId: orderId + "_ST",
    });
};
exports.settleSeller = settleSeller;
const codCollected = async ({ orderId, amount }) => {
    const platform = await wallet_model_1.default.findOne({ user: "PLATFORM" });
    if (!platform)
        throw new Error("Wallet not found");
    platform.availableBalance += amount;
    await platform.save();
    await ledger_model_1.default.create({
        fromUser: "SHIPPER",
        toUser: "PLATFORM",
        amount,
        type: "CREDIT",
        transactionType: "COD_IN",
        orderId,
        referenceId: orderId + "_COD",
    });
};
exports.codCollected = codCollected;
const payoutSellerCOD = async ({ sellerId, amount, orderId }) => {
    const seller = await wallet_model_1.default.findOne({ user: sellerId });
    const platform = await wallet_model_1.default.findOne({ user: "PLATFORM" });
    if (!seller || !platform)
        throw new Error("Wallet not found");
    seller.availableBalance += amount;
    platform.availableBalance -= amount;
    await seller.save();
    await ledger_model_1.default.create({
        fromUser: "PLATFORM",
        toUser: sellerId,
        amount,
        type: "CREDIT",
        transactionType: "COD_OUT",
        orderId,
        referenceId: orderId + "_COD_OUT",
    });
};
exports.payoutSellerCOD = payoutSellerCOD;
const getMyLedger = async (req, res) => {
    try {
        const userId = req.user?._id;
        const ledgers = await ledger_model_1.default.find({
            $or: [{ fromUser: userId }, { toUser: userId }],
        })
            .sort({ createdAt: -1 })
            .limit(50);
        res.json({
            success: true,
            data: ledgers,
        });
    }
    catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
exports.getMyLedger = getMyLedger;
const getAllLedger = async (req, res) => {
    try {
        const data = await ledger_model_1.default.find().sort({ createdAt: -1 }).limit(200);
        res.json({
            success: true,
            data,
        });
    }
    catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
exports.getAllLedger = getAllLedger;
const createLedger = async (req, res) => {
    try {
        const ledger = await ledger_model_1.default.create(req.body);
        res.json({
            success: true,
            data: ledger,
        });
    }
    catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
exports.createLedger = createLedger;
