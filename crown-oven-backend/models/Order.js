// models/Order.js — Order schema with embedded items (delivery & pickup)
import mongoose from "mongoose";

const orderItemSchema = new mongoose.Schema(
  {
    dishId: { type: mongoose.Schema.Types.ObjectId, ref: "Dish", required: true },
    name: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1, max: 20 },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    orderNumber: { type: String, required: true, unique: true },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    orderType: {
      type: String,
      enum: ["delivery", "pickup"],
      required: [true, "Order type is required"],
    },
    items: {
      type: [orderItemSchema],
      required: true,
      validate: [arr => arr.length > 0, "Order must have at least one item"],
    },
    totalAmount: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ["Pending", "Preparing", "Ready", "Delivered", "Collected", "Cancelled"],
      default: "Pending",
    },
    paymentStatus: { type: String, enum: ["unpaid", "paid"], default: "unpaid" },
    deliveryAddress: { type: String, trim: true },
    customerName: { type: String, trim: true },
    phone: { type: String, trim: true },
  },
  { timestamps: true }
);

orderSchema.index({ customerId: 1, createdAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 });

const Order = mongoose.model("Order", orderSchema);
export default Order;
