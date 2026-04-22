// models/Dish.js - Menu dish schema
import mongoose from "mongoose";

const DISH_CATEGORIES = [
  "Special Rice",
  "Rice & Curry",
  "Kottu",
  "Noodles",
  "Side Dishes",
  "Desserts",
  "Beverages",
  "Other",
];

const dishSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Dish name is required"],
      unique: true,
      trim: true,
    },
    category: {
      type: String,
      required: [true, "Category is required"],
      trim: true,
      enum: {
        values: DISH_CATEGORIES,
        message: "Invalid dish category",
      },
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    price: {
      type: Number,
      required: [true, "Price is required"],
      min: [1, "Price must be greater than 0"],
    },
    imageUrl: {
      type: String,
      trim: true,
    },
    isAvailable: {
      type: Boolean,
      default: true,
    },
    averageRating: {
      type: Number,
      min: 0,
      max: 5,
      default: 0,
    },
    ratingCount: {
      type: Number,
      min: 0,
      default: 0,
    },
  },
  { timestamps: true, collection: "dishes" }
);

dishSchema.index({ category: 1 });
dishSchema.index({ isAvailable: 1 });

const Dish = mongoose.model("Dish", dishSchema);
export default Dish;
export { DISH_CATEGORIES };
