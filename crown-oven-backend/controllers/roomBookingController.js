import mongoose from "mongoose";
import Amenity from "../models/Amenity.js";
import Room from "../models/Room.js";
import RoomBooking from "../models/RoomBooking.js";
import User from "../models/User.js";

const VALID_TRANSITIONS = {
  Pending: ["Confirmed", "Rejected"],
  Confirmed: ["Completed"],
};

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

function serializeBooking(booking) {
  const data = booking.toObject ? booking.toObject() : booking;
  const room = data.roomId && typeof data.roomId === "object"
    ? {
        _id: data.roomId._id,
        name: data.roomId.name,
        type: data.roomId.type,
        image: data.roomId.image,
        pricePerHour: data.roomId.pricePerHour,
      }
    : null;
  const customer = data.customerId && typeof data.customerId === "object"
    ? {
        _id: data.customerId._id,
        firstName: data.customerId.firstName,
        lastName: data.customerId.lastName,
        email: data.customerId.email,
        phone: data.customerId.phone,
      }
    : null;

  return {
    ...data,
    room,
    roomName: room?.name || data.roomName,
    roomType: room?.type || data.roomType,
    customer,
    amenities: data.selectedAmenities || [],
    selectedAmenities: data.selectedAmenities || [],
  };
}

async function getSelectableAmenities(room, rawAmenities) {
  const amenityIds = normalizeArrayInput(rawAmenities);
  if (!amenityIds.length) return [];

  const invalidIds = amenityIds.filter((id) => !isValidObjectId(id));
  if (invalidIds.length) {
    throw new Error(`Invalid amenities: ${invalidIds.join(", ")}`);
  }

  const roomAmenityIds = new Set((room.amenities || []).map((amenity) => String(amenity._id || amenity)));
  const amenities = await Amenity.find({ _id: { $in: amenityIds }, isActive: true });

  if (amenities.length !== amenityIds.length) {
    const foundIds = new Set(amenities.map((amenity) => String(amenity._id)));
    const invalidIdsFromDb = amenityIds.filter((id) => !foundIds.has(String(id)));
    throw new Error(`Invalid amenities: ${invalidIdsFromDb.join(", ")}`);
  }

  const unavailable = amenityIds.filter((id) => !roomAmenityIds.has(String(id)));
  if (unavailable.length > 0) {
    throw new Error(`Amenities not available in this room: ${unavailable.join(", ")}`);
  }

  return amenityIds.map((id) => amenities.find((amenity) => String(amenity._id) === String(id)));
}

export async function createBooking(req, res) {
  try {
    const { roomId, date, startTime, endTime, guestCount, selectedAmenities, amenities, specialRequests } = req.body;

    if (!roomId || !date || !startTime || !endTime || !guestCount) {
      return res.status(400).json({ message: "Room, date, start time, end time, and guest count are required" });
    }
    if (!isValidObjectId(roomId)) {
      return res.status(404).json({ message: "Room not found" });
    }

    const bookingDate = new Date(`${date}T00:00:00`);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (Number.isNaN(bookingDate.getTime())) {
      return res.status(400).json({ message: "Invalid date format. Use YYYY-MM-DD" });
    }
    if (bookingDate < today) {
      return res.status(400).json({ message: "Cannot book a past date" });
    }

    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) {
      return res.status(400).json({ message: "Invalid time format. Use HH:mm (24-hour)" });
    }
    if (startTime >= endTime) {
      return res.status(400).json({ message: "End time must be after start time" });
    }

    const [sh, sm] = startTime.split(":").map(Number);
    const [eh, em] = endTime.split(":").map(Number);
    if (bookingDate.getTime() == today.getTime()) {
      const now = new Date();
      const nowMinutes = now.getHours() * 60 + now.getMinutes();
      const startMinutes = sh * 60 + sm;
      if (startMinutes <= nowMinutes) {
        return res.status(400).json({ message: "Start time must be later than the current time" });
      }
    }
    const durationMinutes = (eh * 60 + em) - (sh * 60 + sm);
    if (durationMinutes < 60) {
      return res.status(400).json({ message: "Minimum booking duration is 1 hour" });
    }
    const durationHours = Math.ceil(durationMinutes / 60);

    const room = await Room.findById(roomId).populate("amenities");
    if (!room) return res.status(404).json({ message: "Room not found" });
    if (!room.isAvailable) return res.status(400).json({ message: "Room is not available" });

    const parsedGuestCount = Number(guestCount);
    if (parsedGuestCount < 1) {
      return res.status(400).json({ message: "Guest count must be at least 1" });
    }
    if (parsedGuestCount > room.capacity) {
      return res.status(400).json({ message: `Guest count exceeds room capacity of ${room.capacity}` });
    }

    if (specialRequests && specialRequests.length > 300) {
      return res.status(400).json({ message: "Special requests must be 300 characters or less" });
    }

    const overlapping = await RoomBooking.findOne({
      roomId,
      date,
      status: { $in: ["Pending", "Confirmed"] },
      startTime: { $lt: endTime },
      endTime: { $gt: startTime },
    });
    if (overlapping) {
      return res.status(409).json({ message: "Room is already booked for the selected time slot" });
    }

    const amenityDocs = await getSelectableAmenities(room, selectedAmenities ?? amenities);
    const amenitySnapshots = amenityDocs.map((amenity) => ({
      amenityId: amenity._id,
      name: amenity.name,
      price: amenity.isChargeable ? amenity.price : 0,
      isChargeable: amenity.isChargeable,
    }));

    const baseAmount = durationHours * room.pricePerHour;
    const amenityAmount = amenitySnapshots.reduce((sum, amenity) => sum + amenity.price, 0);
    const totalAmount = baseAmount + amenityAmount;

    const customer = await User.findById(req.user.id);

    const booking = await RoomBooking.create({
      roomId,
      customerId: req.user.id,
      customerName: customer ? `${customer.firstName} ${customer.lastName}`.trim() : "Unknown",
      date,
      startTime,
      endTime,
      guestCount: parsedGuestCount,
      selectedAmenities: amenitySnapshots,
      specialRequests: specialRequests ? specialRequests.trim() : "",
      durationHours,
      baseAmount,
      amenityAmount,
      totalAmount,
      status: "Pending",
    });

    const populated = await RoomBooking.findById(booking._id)
      .populate("roomId", "name type image pricePerHour")
      .populate("customerId", "firstName lastName email phone");

    res.status(201).json({
      message: "Room booked successfully",
      booking: serializeBooking(populated),
      priceBreakdown: {
        roomCost: baseAmount,
        amenityCost: amenityAmount,
        totalAmount,
        hours: durationHours,
        ratePerHour: room.pricePerHour,
        amenities: amenitySnapshots,
      },
    });
  } catch (error) {
    console.error("Create booking error:", error);
    if (
      error.message?.startsWith("Invalid amenities:") ||
      error.message?.startsWith("Amenities not available in this room:")
    ) {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: "Server error" });
  }
}

export async function getMyBookings(req, res) {
  try {
    const bookings = await RoomBooking.find({ customerId: req.user.id })
      .populate("roomId", "name type image pricePerHour")
      .sort({ createdAt: -1 });
    res.json(bookings.map(serializeBooking));
  } catch (error) {
    console.error("Get my bookings error:", error);
    res.status(500).json({ message: "Server error" });
  }
}

export async function cancelBooking(req, res) {
  try {
    if (!isValidObjectId(req.params.id)) return res.status(404).json({ message: "Booking not found" });

    const booking = await RoomBooking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: "Booking not found" });

    if (booking.customerId.toString() !== req.user.id) {
      return res.status(403).json({ message: "Not your booking" });
    }
    if (booking.status !== "Confirmed" && booking.status !== "Pending") {
      return res.status(400).json({ message: "Only Pending or Confirmed bookings can be cancelled" });
    }

    const eventDateTime = new Date(`${booking.date}T${booking.startTime}:00`);
    const now = new Date();
    const hoursUntilEvent = (eventDateTime - now) / (1000 * 60 * 60);
    if (hoursUntilEvent < 24) {
      return res.status(400).json({ message: "Cannot cancel within 24 hours of the event" });
    }

    booking.status = "Cancelled";
    await booking.save();

    const populated = await RoomBooking.findById(booking._id).populate("roomId", "name type image pricePerHour");
    res.json({ message: "Booking cancelled", booking: serializeBooking(populated) });
  } catch (error) {
    console.error("Cancel booking error:", error);
    res.status(500).json({ message: "Server error" });
  }
}

export async function listAllBookings(req, res) {
  try {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.roomId) filter.roomId = req.query.roomId;

    const bookings = await RoomBooking.find(filter)
      .populate("roomId", "name type image pricePerHour")
      .populate("customerId", "firstName lastName email phone")
      .sort({ createdAt: -1 });
    res.json(bookings.map(serializeBooking));
  } catch (error) {
    console.error("List all bookings error:", error);
    res.status(500).json({ message: "Server error" });
  }
}

export async function updateBookingStatus(req, res) {
  try {
    const { status } = req.body;
    if (!status) return res.status(400).json({ message: "Status is required" });
    if (!isValidObjectId(req.params.id)) return res.status(404).json({ message: "Booking not found" });

    const booking = await RoomBooking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: "Booking not found" });

    const allowed = VALID_TRANSITIONS[booking.status];
    if (!allowed || !allowed.includes(status)) {
      return res.status(400).json({
        message: `Cannot change status from ${booking.status} to ${status}. Allowed: ${(allowed || []).join(", ") || "none"}`,
      });
    }

    booking.status = status;
    await booking.save();

    const populated = await RoomBooking.findById(booking._id)
      .populate("roomId", "name type image pricePerHour")
      .populate("customerId", "firstName lastName email phone");

    res.json({ message: `Booking ${status.toLowerCase()}`, booking: serializeBooking(populated) });
  } catch (error) {
    console.error("Update booking status error:", error);
    res.status(500).json({ message: "Server error" });
  }
}
