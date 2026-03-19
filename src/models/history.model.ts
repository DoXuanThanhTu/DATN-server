import mongoose, { Schema, Document } from "mongoose";

export interface IHistory extends Document {
  user: mongoose.Types.ObjectId;
  post: mongoose.Types.ObjectId;
  updatedAt: Date;
}

const HistorySchema = new Schema<IHistory>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    post: { type: Schema.Types.ObjectId, ref: "Post", required: true },
  },
  { timestamps: true },
);

HistorySchema.index({ user: 1, updatedAt: -1 });
HistorySchema.index({ user: 1, post: 1 }, { unique: true });

export default mongoose.models.History ||
  mongoose.model<IHistory>("History", HistorySchema);
