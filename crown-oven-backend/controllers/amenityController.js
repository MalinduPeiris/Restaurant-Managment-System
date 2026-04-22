import mongoose from "mongoose";
import Amenity from "../models/Amenity.js";

function normalizeBoolean(value, fallback = false) {
  if (value === undefined) return fallback;
  if (typeof value === "boolean") return value;
  return String(value).toLowerCase() === "true";
}

function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

export async function listAmenities(req, res) {
  try {
    const filter = req.user?.role === "admin" ? {} : { isActive: true };
    const amenities = await Amenity.find(filter).sort({ name: 1 });
    res.json(amenities);
  } catch (error) {
    console.error("List amenities error:", error);
    res.status(500).json({ message: "Server error" });
  }
}

export async function createAmenity(req, res) {
  try {
    const { name, price, isChargeable, isActive } = req.body;
    const parsedPrice = Number(price || 0);
    const chargeable = normalizeBoolean(isChargeable, parsedPrice > 0);

    if (!name?.trim()) {
      return res.status(400).json({ message: "Amenity name is required" });
    }
    if (Number.isNaN(parsedPrice) || parsedPrice < 0) {
      return res.status(400).json({ message: "Amenity price must be 0 or higher" });
    }

    const amenity = await Amenity.create({
      name: name.trim(),
      price: parsedPrice,
      isChargeable: chargeable,
      isActive: normalizeBoolean(isActive, true),
    });

    res.status(201).json({ message: "Amenity created", amenity });
  } catch (error) {
    console.error("Create amenity error:", error);
    if (error?.code === 11000) {
      return res.status(400).json({ message: "Amenity name already exists" });
    }
    res.status(500).json({ message: "Server error" });
  }
}

export async function updateAmenity(req, res) {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(404).json({ message: "Amenity not found" });
    }

    const { name, price, isChargeable, isActive } = req.body;
    const updates = {};

    if (name !== undefined) {
      if (!name.trim()) {
        return res.status(400).json({ message: "Amenity name cannot be empty" });
      }
      updates.name = name.trim();
    }

    const chargeable = isChargeable !== undefined
      ? normalizeBoolean(isChargeable)
      : undefined;

    if (chargeable !== undefined) {
      updates.isChargeable = chargeable;
      if (!chargeable) {
        updates.price = 0;
      }
    }

    if (price !== undefined && (chargeable === undefined || chargeable)) {
      const parsedPrice = Number(price);
      if (Number.isNaN(parsedPrice) || parsedPrice < 0) {
        return res.status(400).json({ message: "Amenity price must be 0 or higher" });
      }
      updates.price = parsedPrice;
    }

    if (isActive !== undefined) {
      updates.isActive = normalizeBoolean(isActive, true);
    }

    const amenity = await Amenity.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    });

    if (!amenity) {
      return res.status(404).json({ message: "Amenity not found" });
    }

    res.json({ message: "Amenity updated", amenity });
  } catch (error) {
    console.error("Update amenity error:", error);
    if (error?.code === 11000) {
      return res.status(400).json({ message: "Amenity name already exists" });
    }
    res.status(500).json({ message: "Server error" });
  }
}
