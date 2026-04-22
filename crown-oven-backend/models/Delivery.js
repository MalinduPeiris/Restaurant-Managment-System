import mongoose from "mongoose";

const deliverySchema = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      unique: true,
    },
    riderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    status: {
      type: String,
      enum: ["PENDING", "ASSIGNED", "ON_THE_WAY", "DELIVERED"],
      default: "PENDING",
    },
    deliveryAddress: {
      type: String,
      required: true,
    },
    customerName: {
      type: String,
      required: true,
    },
    customerPhone: {
      type: String,
      default: "",
    },
    assignedAt: { type: Date, default: null },
    pickedUpAt: { type: Date, default: null },
    deliveredAt: { type: Date, default: null },
  },
  { timestamps: true }
);

deliverySchema.index({ riderId: 1, status: 1 });
deliverySchema.index({ status: 1, createdAt: -1 });

const Delivery = mongoose.model("Delivery", deliverySchema);
export default Delivery;
