// models/Reservation.js — Reservation schema for table bookings
import mongoose from "mongoose";

const reservationSchema = new mongoose.Schema(
  {
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Customer is required"],
    },
    customerName: {
      type: String,
      trim: true,
    },
    tableId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DiningTable",
      required: [true, "Table is required"],
    },
    date: {
      type: Date,
      required: [true, "Reservation date is required"],
    },
    timeSlot: {
      type: String,
      required: [true, "Time slot is required"],
      trim: true,
    },
    seatCount: {
      type: Number,
      required: [true, "Seat count is required"],
      enum: { values: [2, 4, 6, 8], message: "Seat count must be 2, 4, 6 or 8" },
    },
    status: {
      type: String,
      enum: ["Pending", "Confirmed", "Completed", "Cancelled", "No-show"],
      default: "Pending",
    },
    specialRequests: {
      type: String,
      trim: true,
      maxlength: [300, "Special requests cannot exceed 300 characters"],
    },
  },
  { timestamps: true }
);

reservationSchema.index({ customerId: 1, date: -1 });
reservationSchema.index({ tableId: 1, date: 1, timeSlot: 1 });
reservationSchema.index({ status: 1, date: -1 });

const Reservation = mongoose.model("Reservation", reservationSchema);
export default Reservation;
