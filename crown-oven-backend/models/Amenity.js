import mongoose from "mongoose";

const amenitySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, unique: true },
    price: { type: Number, required: true, min: 0, default: 0 },
    isChargeable: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

amenitySchema.pre("validate", function syncPriceFlags() {
  if (!this.isChargeable) {
    this.price = 0;
  }
});

export default mongoose.model("Amenity", amenitySchema);

