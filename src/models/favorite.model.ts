import mongoose, { Schema, Document } from "mongoose";

export interface IFavorite extends Document {
  user: mongoose.Types.ObjectId;
  post: mongoose.Types.ObjectId;
  createdAt: Date;
}

const FavoriteSchema = new Schema<IFavorite>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    post: { type: Schema.Types.ObjectId, ref: "Post", required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

FavoriteSchema.index({ user: 1, post: 1 }, { unique: true });

export default mongoose.models.Favorite ||
  mongoose.model<IFavorite>("Favorite", FavoriteSchema);
