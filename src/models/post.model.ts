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
  condition: {
    label: "new" | "like_new" | "good" | "fair" | "for_parts";
    percentage: number;
    isFullbox: boolean;
    warranty: string;
  };
  status: "pending" | "active" | "sold" | "hidden" | "rejected";
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

    condition: {
      label: {
        type: String,
        enum: ["new", "like_new", "good", "fair", "for_parts"],
        required: true,
        default: "good",
      },
      percentage: {
        type: Number,
        min: 0,
        max: 100,
        default: 100,
      },
      isFullbox: {
        type: Boolean,
        default: false,
      },
      warranty: {
        type: String,
        trim: true,
        default: "Không bảo hành",
      },
    },
    status: {
      type: String,
      enum: ["pending", "active", "sold", "hidden", "rejected"],
      default: "pending",
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
