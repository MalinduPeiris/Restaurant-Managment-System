// controllers/reservationController.js - Reservation business logic
import mongoose from "mongoose";
import Reservation from "../models/Reservation.js";
import DiningTable from "../models/DiningTable.js";

const MAX_ADVANCE_BOOKING_MONTHS = 2;

function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

function parseTimeSlot(timeSlot) {
  const timeSlotRegex = /^(1[0-2]|[1-9]):[0-5]\d\s(AM|PM)$/i;
  if (!timeSlotRegex.test(timeSlot)) return null;

  const [hourStr, rest] = timeSlot.split(":");
  const [minStr, periodStr] = rest.split(" ");
  let hour24 = parseInt(hourStr);
  const mins = parseInt(minStr);
  const period = periodStr.toUpperCase();
  if (period === "PM" && hour24 !== 12) hour24 += 12;
  if (period === "AM" && hour24 === 12) hour24 = 0;
  return hour24 + mins / 60;
}

function normalizeDate(date) {
  if (!date) return null;

  if (typeof date === "string") {
    const match = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (match) {
      const [, year, month, day] = match;
      return new Date(Number(year), Number(month) - 1, Number(day));
    }
  }

  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return null;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function getCurrentDecimalTime(now = new Date()) {
  return now.getHours() + now.getMinutes() / 60 + now.getSeconds() / 3600;
}

function getMaxReservationDate(now = new Date()) {
  const today = normalizeDate(now);
  const maxDate = new Date(today);
  maxDate.setMonth(maxDate.getMonth() + MAX_ADVANCE_BOOKING_MONTHS);
  return normalizeDate(maxDate);
}

function validateReservationDate(date, decimalTime, now = new Date()) {
  const reservationDate = normalizeDate(date);
  if (!reservationDate) {
    return "Invalid reservation date";
  }

  const today = normalizeDate(now);
  const maxDate = getMaxReservationDate(now);

  if (reservationDate < today) {
    return "Reservation date cannot be in the past";
  }
  if (reservationDate > maxDate) {
    return `Reservations can only be made up to ${MAX_ADVANCE_BOOKING_MONTHS} months in advance`;
  }
  if (reservationDate.getTime() === today.getTime() && decimalTime <= getCurrentDecimalTime(now)) {
    return "For today, please choose a time later than the current time";
  }

  return null;
}

export async function createReservation(req, res) {
  try {
    const { tableId, date, timeSlot, seatCount, specialRequests } = req.body;

    if (!tableId) return res.status(400).json({ message: "Table is required" });
    if (!date) return res.status(400).json({ message: "Reservation date is required" });
    if (!timeSlot) return res.status(400).json({ message: "Time slot is required" });
    if (!seatCount) return res.status(400).json({ message: "Seat count is required" });
    if (!isValidObjectId(tableId)) return res.status(404).json({ message: "Table not found" });

    const parsedSeatCount = Number(seatCount);
    if (!Number.isInteger(parsedSeatCount) || ![2, 4, 6, 8].includes(parsedSeatCount)) {
      return res.status(400).json({ message: "Seat count must be 2, 4, 6 or 8" });
    }

    const decimalTime = parseTimeSlot(timeSlot);
    if (decimalTime === null) {
      return res.status(400).json({ message: "Invalid time slot format. Use format like '8:30 AM'" });
    }

    if (decimalTime < 8.5 || decimalTime > 23.5) {
      return res.status(400).json({ message: "Time slot must be within operating hours (8:30 AM - 11:30 PM)" });
    }

    const dateError = validateReservationDate(date, decimalTime);
    if (dateError) {
      return res.status(400).json({ message: dateError });
    }
    const reservationDate = normalizeDate(date);

    if (specialRequests && specialRequests.length > 300) {
      return res.status(400).json({ message: "Special requests cannot exceed 300 characters" });
    }

    const table = await DiningTable.findById(tableId);
    if (!table) return res.status(404).json({ message: "Table not found" });
    if (!table.isAvailable) {
      return res.status(400).json({ message: "This table is currently not available" });
    }
    if (table.seats < parsedSeatCount) {
      return res.status(400).json({
        message: `Table ${table.tableNo} only has ${table.seats} seats, but ${parsedSeatCount} were requested`,
      });
    }

    const normalizedTimeSlot = timeSlot.toUpperCase();

    const conflict = await Reservation.findOne({
      tableId,
      date: reservationDate,
      timeSlot: normalizedTimeSlot,
      status: { $nin: ["Cancelled"] },
    });

    if (conflict) {
      return res.status(409).json({
        message: `Table ${table.tableNo} is already reserved at ${timeSlot} on this date`,
      });
    }

    const reservation = await Reservation.create({
      customerId: req.user.id,
      customerName: `${req.user.firstName} ${req.user.lastName}`,
      tableId,
      date: reservationDate,
      timeSlot: normalizedTimeSlot,
      seatCount: parsedSeatCount,
      specialRequests: specialRequests ? specialRequests.trim() : undefined,
    });

    res.status(201).json({ message: "Reservation created successfully", reservation });
  } catch (error) {
    console.error("Create reservation error:", error);
    res.status(500).json({ message: "Server error" });
  }
}

export async function getMyReservations(req, res) {
  try {
    const reservations = await Reservation.find({ customerId: req.user.id })
      .sort({ date: -1 })
      .populate("tableId", "tableNo seats location")
      .lean();
    res.json(reservations);
  } catch (error) {
    console.error("Get my reservations error:", error);
    res.status(500).json({ message: "Server error" });
  }
}

export async function cancelReservation(req, res) {
  try {
    if (!isValidObjectId(req.params.id)) return res.status(404).json({ message: "Reservation not found" });

    const reservation = await Reservation.findById(req.params.id);
    if (!reservation) return res.status(404).json({ message: "Reservation not found" });

    if (reservation.customerId.toString() !== req.user.id) {
      return res.status(403).json({ message: "Access denied" });
    }

    if (!['Pending', 'Confirmed'].includes(reservation.status)) {
      return res.status(400).json({
        message: `Cannot cancel reservation with status: ${reservation.status}`,
      });
    }

    reservation.status = "Cancelled";
    await reservation.save();
    res.json({ message: "Reservation cancelled", reservation });
  } catch (error) {
    console.error("Cancel reservation error:", error);
    res.status(500).json({ message: "Server error" });
  }
}

export async function listAllReservations(req, res) {
  try {
    const { status, date } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (date) filter.date = normalizeDate(date);

    const reservations = await Reservation.find(filter)
      .sort({ date: -1, createdAt: -1 })
      .populate("tableId", "tableNo seats location")
      .populate("customerId", "firstName lastName email")
      .lean();
    res.json(reservations);
  } catch (error) {
    console.error("List all reservations error:", error);
    res.status(500).json({ message: "Server error" });
  }
}

const STATUS_TRANSITIONS = {
  Pending: ["Confirmed", "Cancelled"],
  Confirmed: ["Completed", "Cancelled", "No-show"],
};

export async function updateReservationStatus(req, res) {
  try {
    const { status } = req.body;
    const validStatuses = ["Pending", "Confirmed", "Completed", "Cancelled", "No-show"];

    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        message: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
      });
    }
    if (!isValidObjectId(req.params.id)) return res.status(404).json({ message: "Reservation not found" });

    const reservation = await Reservation.findById(req.params.id);
    if (!reservation) return res.status(404).json({ message: "Reservation not found" });

    if (["Completed", "Cancelled", "No-show"].includes(reservation.status)) {
      return res.status(400).json({
        message: `Cannot update reservation with status: ${reservation.status}`,
      });
    }

    const allowed = STATUS_TRANSITIONS[reservation.status] || [];
    if (!allowed.includes(status)) {
      return res.status(400).json({
        message: `Cannot change status from "${reservation.status}" to "${status}". Allowed: ${allowed.join(", ")}`,
      });
    }

    reservation.status = status;
    await reservation.save();

    res.json({ message: `Reservation status updated to ${status}`, reservation });
  } catch (error) {
    console.error("Update reservation status error:", error);
    res.status(500).json({ message: "Server error" });
  }
}

export async function getAvailableTablesForReservation(req, res) {
  try {
    const { date, timeSlot, minSeats } = req.query;

    if (!date) return res.status(400).json({ message: "Date is required" });
    if (!timeSlot) return res.status(400).json({ message: "Time slot is required" });

    const decimalTime = parseTimeSlot(timeSlot);
    if (decimalTime === null) {
      return res.status(400).json({ message: "Invalid time slot format. Use format like '8:30 AM'" });
    }

    if (decimalTime < 8.5 || decimalTime > 23.5) {
      return res.status(400).json({ message: "Time slot must be within operating hours (8:30 AM - 11:30 PM)" });
    }

    const dateError = validateReservationDate(date, decimalTime);
    if (dateError) {
      return res.status(400).json({ message: dateError });
    }

    const minSeatCount = minSeats ? parseInt(minSeats) : 0;
    if (minSeats && (isNaN(minSeatCount) || ![2, 4, 6, 8].includes(minSeatCount))) {
      return res.status(400).json({ message: "minSeats must be 2, 4, 6 or 8" });
    }

    const normalizedTimeSlot = timeSlot.toUpperCase();
    const reservationDate = normalizeDate(date);

    const conflictingReservations = await Reservation.find({
      date: reservationDate,
      timeSlot: normalizedTimeSlot,
      status: { $nin: ["Cancelled"] },
    }).select("tableId");

    const reservedTableIds = conflictingReservations.map((reservation) => reservation.tableId);

    const tableFilter = {
      isAvailable: true,
      _id: { $nin: reservedTableIds },
    };
    if (minSeatCount > 0) {
      tableFilter.seats = { $gte: minSeatCount };
    }

    const tables = await DiningTable.find(tableFilter)
      .sort({ seats: 1, tableNo: 1 })
      .lean();

    res.json(tables);
  } catch (error) {
    console.error("Get available tables error:", error);
    res.status(500).json({ message: "Server error" });
  }
}

