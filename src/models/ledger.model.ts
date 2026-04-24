import mongoose from "mongoose";

const LedgerSchema = new mongoose.Schema(
  {
    fromWallet: { type: mongoose.Schema.Types.ObjectId, ref: "Wallet" },
    toWallet: { type: mongoose.Schema.Types.ObjectId, ref: "Wallet" },

    fromUser: mongoose.Schema.Types.Mixed,
    toUser: mongoose.Schema.Types.Mixed,

    orderId: { type: mongoose.Schema.Types.ObjectId },

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
  },
  { timestamps: true }
);

export default mongoose.model("Ledger", LedgerSchema);