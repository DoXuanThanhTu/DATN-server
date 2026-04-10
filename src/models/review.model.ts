import mongoose, { Schema, Document } from "mongoose";

export interface IReview extends Document {
  order: mongoose.Types.ObjectId;
  reviewer: mongoose.Types.ObjectId;
  reviewee: mongoose.Types.ObjectId;
  rating: number;
  comment: string;
  type: "BUYER_TO_SELLER" | "SELLER_TO_BUYER";
  createdAt: Date;
}

const reviewSchema: Schema = new Schema(
  {
    order: { type: Schema.Types.ObjectId, ref: "Order", required: true },
    reviewer: { type: Schema.Types.ObjectId, ref: "User", required: true },
    reviewee: { type: Schema.Types.ObjectId, ref: "User", required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, trim: true, maxlength: 500 },
    type: {
      type: String,
      enum: ["BUYER_TO_SELLER", "SELLER_TO_BUYER"],
      required: true,
    },
  },
  { timestamps: true },
);

// Đảm bảo một người chỉ có thể để lại 1 loại đánh giá cho 1 đơn hàng cụ thể
reviewSchema.index({ order: 1, reviewer: 1, type: 1 }, { unique: true });

export default mongoose.model<IReview>("Review", reviewSchema);
