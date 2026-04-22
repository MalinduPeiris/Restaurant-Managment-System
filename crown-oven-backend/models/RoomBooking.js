import mongoose from "mongoose";

const bookingAmenitySchema = new mongoose.Schema(
  {
    amenityId: { type: mongoose.Schema.Types.ObjectId, ref: "Amenity", required: true },
    name: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0, default: 0 },
    isChargeable: { type: Boolean, default: false },
  },
  { _id: false }
);

const roomBookingSchema = new mongoose.Schema(
  {
    roomId: { type: mongoose.Schema.Types.ObjectId, ref: "Room", required: true },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    customerName: { type: String, required: true },
    date: { type: String, required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    guestCount: { type: Number, required: true, min: 1 },
    selectedAmenities: [bookingAmenitySchema],
    specialRequests: { type: String, trim: true, maxlength: 300, default: "" },
    durationHours: { type: Number, required: true, min: 1 },
    baseAmount: { type: Number, required: true, min: 0 },
    amenityAmount: { type: Number, required: true, min: 0, default: 0 },
    totalAmount: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ["Pending", "Confirmed", "Rejected", "Cancelled", "Completed"],
      default: "Pending",
    },
  },
  { timestamps: true }
);

roomBookingSchema.index({ roomId: 1, date: 1, status: 1 });
roomBookingSchema.index({ customerId: 1, createdAt: -1 });

export default mongoose.model("RoomBooking", roomBookingSchema);
