// models/DiningTable.js — Restaurant table schema
import mongoose from "mongoose";

const diningTableSchema = new mongoose.Schema(
  {
    tableNo: {
      type: String,
      required: [true, "Table number is required"],
      unique: true,
      trim: true,
    },
    seats: {
      type: Number,
      required: [true, "Seat count is required"],
      enum: { values: [2, 4, 6, 8], message: "Seats must be 2, 4, 6 or 8" },
      default: 2,
    },
    location: {
      type: String,
      enum: ["indoor", "outdoor"],
      default: "indoor",
    },
    isAvailable: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true, collection: "tables" }
);

// tableNo index already created by unique: true

const DiningTable = mongoose.model("DiningTable", diningTableSchema);
export default DiningTable;
