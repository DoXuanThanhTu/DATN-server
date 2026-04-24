import mongoose from "mongoose";

const WalletSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.Mixed, 
      required: true,
      index: true,
    },

    availableBalance: { type: Number, default: 0 },

    pendingBalance: { type: Number, default: 0 }, 

    frozenBalance: { type: Number, default: 0 }, 

    currency: { type: String, default: "VND" },
  },
  { timestamps: true }
);

export default mongoose.model("Wallet", WalletSchema);