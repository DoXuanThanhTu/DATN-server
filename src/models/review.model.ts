import mongoose, { Schema, Document } from "mongoose";

export interface IReview extends Document {
  reviewer: mongoose.Types.ObjectId;
  receiver: mongoose.Types.ObjectId;
  post: mongoose.Types.ObjectId;
  rating: number;
  comment: string;
  images: string[];
}

const ReviewSchema = new Schema<IReview>(
  {
    reviewer: { type: Schema.Types.ObjectId, ref: "User", required: true },
    receiver: { type: Schema.Types.ObjectId, ref: "User", required: true },
    post: { type: Schema.Types.ObjectId, ref: "Post", required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, required: true, trim: true },
    images: [{ type: String }],
  },
  { timestamps: true },
);

ReviewSchema.index({ reviewer: 1, createdAt: -1 });
ReviewSchema.index({ receiver: 1 });

export default mongoose.models.Review ||
  mongoose.model<IReview>("Review", ReviewSchema);
