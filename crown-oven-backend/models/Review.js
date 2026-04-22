// models/Review.js — Customer review schema
import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema(
  {
    dishId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Dish",
      required: [true, "Dish ID is required"],
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    customerName: {
      type: String,
      required: true,
      trim: true,
    },
    rating: {
      type: Number,
      required: [true, "Rating is required"],
      min: [1, "Rating must be at least 1"],
      max: [5, "Rating cannot exceed 5"],
    },
    comment: {
      type: String,
      trim: true,
      maxlength: [220, "Comment cannot exceed 220 characters"],
      default: "",
    },
  },
  { timestamps: true, collection: "reviews" }
);

// One review per customer per dish
reviewSchema.index({ dishId: 1, customerId: 1 }, { unique: true });
reviewSchema.index({ dishId: 1, createdAt: -1 });

const Review = mongoose.model("Review", reviewSchema);
export default Review;
