import mongoose from "mongoose";

const roomSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    type: { type: String, enum: ["private", "vip", "party"], required: true },
    capacity: { type: Number, required: true, min: 10, max: 100 },
    pricePerHour: { type: Number, required: true, min: 0 },
    amenities: [{ type: mongoose.Schema.Types.ObjectId, ref: "Amenity" }],
    description: { type: String, trim: true, maxlength: 500, default: "" },
    image: { type: String, default: "" },
    isAvailable: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model("Room", roomSchema);
