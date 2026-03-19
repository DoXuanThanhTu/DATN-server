import mongoose, { Schema, Document } from "mongoose";

export interface IPost extends Document {
  title: string;
  slug: string;
  description: string;
  price: number;
  priceNegotiable: boolean;
  images: string[];
  category: mongoose.Types.ObjectId;
  seller: mongoose.Types.ObjectId;
  location: {
    provinceCode: string;
    provinceName: string;
    wardCode: string;
    wardName: string;
    detail: string;
    fullAddress: string;
    lat?: number;
    lng?: number;
  };
  condition: "new" | "used";
  status: "active" | "sold" | "hidden";
  views: number;
}

const productSchema = new Schema<IPost>(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, unique: true },
    description: { type: String },
    price: { type: Number, required: true },
    priceNegotiable: { type: Boolean, default: false },
    images: { type: [String], default: [] },
    category: { type: Schema.Types.ObjectId, ref: "Category", index: true },
    seller: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    location: {
      provinceCode: { type: String, required: true, index: true },
      provinceName: { type: String, required: true },
      wardCode: { type: String, required: true, index: true },
      wardName: { type: String, required: true },
      detail: { type: String },
      fullAddress: { type: String },
      lat: Number,
      lng: Number,
    },

    condition: { type: String, enum: ["new", "used"], default: "used" },
    status: {
      type: String,
      enum: ["active", "sold", "hidden"],
      default: "active",
      index: true,
    },
    views: { type: Number, default: 0 },
  },
  { timestamps: true },
);

productSchema.index({
  title: "text",
  "location.fullAddress": "text",
  description: "text",
});
productSchema.index({ "location.provinceCode": 1, status: 1 });
productSchema.index({ price: 1 });
productSchema.index({ createdAt: -1 });

export default mongoose.model<IPost>("Post", productSchema);
