import mongoose from "mongoose";

const userInteractionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    /**
     * Post có thể null
     * vì search không gắn với post cụ thể
     */
    post: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post",
      default: null,
      index: true,
    },

    /**
     * SEARCH KEYWORD
     */
    keyword: {
      type: String,
      default: null,
      trim: true,
      index: true,
    },

    normalizedKeyword: {
      type: String,
      default: null,
      index: true,
    },

    type: {
      type: String,
      enum: ["view", "like", "save", "chat", "purchase", "search"],
      required: true,
      index: true,
    },

    score: {
      type: Number,
      default: 1,
    },
  },
  {
    timestamps: true,
  },
);

export default mongoose.model("UserInteraction", userInteractionSchema);
