import mongoose, { Schema } from "mongoose";

const locationSchema = new Schema(
  {
    code: { type: String, required: true, unique: true },

    name: String,
    nameEn: String,

    fullName: String,
    fullNameEn: String,

    codeName: String,

    type: {
      type: String,
      enum: ["province", "ward"],
      index: true,
    },

    administrativeUnitId: {
      type: Number,
      index: true,
    },

    parentCode: {
      type: String,
      default: null,
      index: true,
    },
  },
  { timestamps: true },
);

locationSchema.index({ parentCode: 1, type: 1 });

export default mongoose.model("Location", locationSchema);
