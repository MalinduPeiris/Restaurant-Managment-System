import mongoose from "mongoose";
import Amenity from "../models/Amenity.js";
import Room from "../models/Room.js";
import RoomBooking from "../models/RoomBooking.js";

const VALID_TYPES = ["private", "vip", "party"];

function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

function normalizeArrayInput(value) {
  if (value === undefined || value === null || value === "") return [];
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return [];
    if (trimmed.startsWith("[")) {
      try {
        const parsed = JSON.parse(trimmed);
        return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
      } catch {
        return [];
      }
    }
    return [trimmed];
  }
  return [];
}

async function resolveAmenityIds(rawAmenities) {
  const amenityIds = normalizeArrayInput(rawAmenities);
  if (!amenityIds.length) return [];

  const invalidIds = amenityIds.filter((id) => !isValidObjectId(id));
  if (invalidIds.length) {
    throw new Error(`Invalid amenities: ${invalidIds.join(", ")}`);
  }

  const amenities = await Amenity.find({ _id: { $in: amenityIds } });
  if (amenities.length !== amenityIds.length) {
    const foundIds = new Set(amenities.map((amenity) => String(amenity._id)));
    const missingIds = amenityIds.filter((id) => !foundIds.has(String(id)));
    throw new Error(`Invalid amenities: ${missingIds.join(", ")}`);
  }

  return amenityIds;
}

function serializeRoom(room, includeInactiveAmenities = false) {
  const data = room.toObject ? room.toObject() : room;
  const amenities = (data.amenities || []).filter((amenity) => {
    if (!amenity || typeof amenity !== "object") return false;
    return includeInactiveAmenities ? true : amenity.isActive !== false;
  });

  return {
    ...data,
    amenities,
  };
}

async function findRoomById(id) {
  return Room.findById(id).populate("amenities");
}

function parseFiniteNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : NaN;
}

export async function createRoom(req, res) {
  try {
    const { name, type, capacity, pricePerHour, amenities, description } = req.body;

    if (!name || !type || !capacity || pricePerHour === undefined) {
      return res.status(400).json({ message: "Name, type, capacity, and price per hour are required" });
    }
    if (!VALID_TYPES.includes(type)) {
      return res.status(400).json({ message: "Type must be private, vip, or party" });
    }
    const parsedCapacity = parseFiniteNumber(capacity);
    const parsedPricePerHour = parseFiniteNumber(pricePerHour);
    if (Number.isNaN(parsedCapacity) || parsedCapacity < 10 || parsedCapacity > 100) {
      return res.status(400).json({ message: "Capacity must be between 10 and 100" });
    }
    if (Number.isNaN(parsedPricePerHour) || parsedPricePerHour < 0) {
      return res.status(400).json({ message: "Price per hour cannot be negative" });
    }
    if (description && description.length > 500) {
      return res.status(400).json({ message: "Description must be 500 characters or less" });
    }

    const amenityIds = await resolveAmenityIds(amenities);

    const room = await Room.create({
      name: name.trim(),
      type,
      capacity: parsedCapacity,
      pricePerHour: parsedPricePerHour,
      amenities: amenityIds,
      description: description ? description.trim() : "",
      image: req.file ? req.file.path : "",
    });

    const populatedRoom = await findRoomById(room._id);
    res.status(201).json({ message: "Room created", room: serializeRoom(populatedRoom, true) });
  } catch (error) {
    console.error("Create room error:", error);
    if (error.message?.startsWith("Invalid amenities:")) {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: "Server error" });
  }
}

export async function listRooms(req, res) {
  try {
    const filter = req.user?.role === "admin" ? {} : { isAvailable: true };
    const includeInactiveAmenities = req.user?.role === "admin";
    const rooms = await Room.find(filter)
      .populate("amenities")
      .sort({ createdAt: -1 });

    res.json(rooms.map((room) => serializeRoom(room, includeInactiveAmenities)));
  } catch (error) {
    console.error("List rooms error:", error);
    res.status(500).json({ message: "Server error" });
  }
}

export async function getRoomById(req, res) {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(404).json({ message: "Room not found" });
    }

    const room = await findRoomById(req.params.id);
    if (!room) return res.status(404).json({ message: "Room not found" });
    if (req.user?.role !== "admin" && room.isAvailable === false) {
      return res.status(404).json({ message: "Room not found" });
    }

    const includeInactiveAmenities = req.user?.role === "admin";
    res.json(serializeRoom(room, includeInactiveAmenities));
  } catch (error) {
    console.error("Get room error:", error);
    res.status(500).json({ message: "Server error" });
  }
}

export async function updateRoom(req, res) {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(404).json({ message: "Room not found" });
    }

    const { name, type, capacity, pricePerHour, amenities, description, isAvailable, removeImage } = req.body;
    const updates = {};

    if (name !== undefined) {
      if (!name.trim()) {
        return res.status(400).json({ message: "Name cannot be empty" });
      }
      updates.name = name.trim();
    }
    if (type !== undefined) {
      if (!VALID_TYPES.includes(type)) {
        return res.status(400).json({ message: "Type must be private, vip, or party" });
      }
      updates.type = type;
    }
    if (capacity !== undefined) {
      const parsedCapacity = parseFiniteNumber(capacity);
      if (Number.isNaN(parsedCapacity) || parsedCapacity < 10 || parsedCapacity > 100) {
        return res.status(400).json({ message: "Capacity must be between 10 and 100" });
      }
      updates.capacity = parsedCapacity;
    }
    if (pricePerHour !== undefined) {
      const parsedPricePerHour = parseFiniteNumber(pricePerHour);
      if (Number.isNaN(parsedPricePerHour) || parsedPricePerHour < 0) {
        return res.status(400).json({ message: "Price per hour cannot be negative" });
      }
      updates.pricePerHour = parsedPricePerHour;
    }
    if (amenities !== undefined) {
      updates.amenities = await resolveAmenityIds(amenities);
    }
    if (description !== undefined) {
      if (description.length > 500) {
        return res.status(400).json({ message: "Description must be 500 characters or less" });
      }
      updates.description = description.trim();
    }
    if (isAvailable !== undefined) {
      updates.isAvailable = String(isAvailable).toLowerCase() === "true";
    }
    if (String(removeImage).toLowerCase() === "true") {
      updates.image = "";
    }
    if (req.file) updates.image = req.file.path;

    const room = await Room.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true })
      .populate("amenities");
    if (!room) return res.status(404).json({ message: "Room not found" });

    res.json({ message: "Room updated", room: serializeRoom(room, true) });
  } catch (error) {
    console.error("Update room error:", error);
    if (error.message?.startsWith("Invalid amenities:")) {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: "Server error" });
  }
}

export async function deleteRoom(req, res) {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(404).json({ message: "Room not found" });
    }

    const activeBookings = await RoomBooking.countDocuments({
      roomId: req.params.id,
      status: { $in: ["Pending", "Confirmed"] },
    });
    if (activeBookings > 0) {
      return res.status(400).json({ message: "Cannot delete room with active bookings" });
    }

    const room = await Room.findByIdAndDelete(req.params.id);
    if (!room) return res.status(404).json({ message: "Room not found" });

    res.json({ message: "Room deleted" });
  } catch (error) {
    console.error("Delete room error:", error);
    res.status(500).json({ message: "Server error" });
  }
}
