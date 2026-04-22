// models/Payment.js — Payment schema with proof upload and refund workflow
import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
  {
    paymentId: { type: String, required: true, unique: true, trim: true },
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true, unique: true },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    amount: { type: Number, required: true, min: 0 },
    paymentMethod: { type: String, enum: ["cash", "bank_transfer"], required: true },
    proofImageUrl: { type: String },
    status: { type: String, enum: ["pending", "submitted", "verified", "rejected"], default: "pending" },
    refundStatus: { type: String, enum: ["none", "requested", "approved", "rejected"], default: "none" },
    refundRequestedAt: { type: Date },
    refundReviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

// orderId index already created by unique: true
paymentSchema.index({ customerId: 1 });
paymentSchema.index({ status: 1 });

const Payment = mongoose.model("Payment", paymentSchema);
export default Payment;
