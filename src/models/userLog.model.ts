import mongoose, { Schema } from "mongoose";
// export interface IUserLog {
//   userId?: mongoose.Types.ObjectId;
//   itemId?: mongoose.Types.ObjectId;
//   action: "view" | "click" | "search" | "buy";
//   keyword?: string;
//   createdAt: Date;
// }

const userLogSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, index: true },
  itemId: { type: Schema.Types.ObjectId, index: true },

  action: {
    type: String,
    enum: ["view", "click", "search", "buy"],
    index: true
  },

  keyword: String,

  createdAt: { type: Date, default: Date.now, index: true }
});

export default mongoose.model("UserLog", userLogSchema);