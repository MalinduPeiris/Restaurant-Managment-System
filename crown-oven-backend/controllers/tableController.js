// controllers/tableController.js - Table management with availability logic
import mongoose from "mongoose";
import DiningTable from "../models/DiningTable.js";
import Reservation from "../models/Reservation.js";

function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

export async function listTables(req, res) {
  try {
    const filter = req.user?.role === "admin" ? {} : { isAvailable: true };
    const tables = await DiningTable.find(filter).sort({ tableNo: 1 }).lean();
    res.json(tables);
  } catch (error) {
    console.error("List tables error:", error);
    res.status(500).json({ message: "Server error" });
  }
}

export async function getAvailableTables(req, res) {
  try {
    const { date, timeSlot, minSeats } = req.query;

    if (!date) {
      return res.status(400).json({ message: "date query parameter is required" });
    }
    if (!timeSlot) {
      return res.status(400).json({ message: "timeSlot query parameter is required" });
    }

    const timeSlotRegex = /^(1[0-2]|[1-9]):[0-5]\d\s(AM|PM)$/i;
    if (!timeSlotRegex.test(timeSlot)) {
      return res.status(400).json({ message: "Invalid time slot format. Use format like '8:30 AM'" });
    }

    const [hourStr, rest] = timeSlot.split(":");
    const [minStr, periodStr] = rest.split(" ");
    let hour24 = parseInt(hourStr);
    const mins = parseInt(minStr);
    const period = periodStr.toUpperCase();
    if (period === "PM" && hour24 !== 12) hour24 += 12;
    if (period === "AM" && hour24 === 12) hour24 = 0;
    const decimalTime = hour24 + mins / 60;
    if (decimalTime < 8.5 || decimalTime > 23.5) {
      return res.status(400).json({ message: "Time slot must be within operating hours (8:30 AM - 11:30 PM)" });
    }

    const minSeatCount = minSeats ? Number(minSeats) : null;
    if (minSeats && (isNaN(minSeatCount) || ![2, 4, 6, 8].includes(minSeatCount))) {
      return res.status(400).json({ message: "minSeats must be 2, 4, 6 or 8" });
    }

    const normalizedDate = new Date(date);
    normalizedDate.setUTCHours(0, 0, 0, 0);
    const normalizedTimeSlot = timeSlot.toUpperCase();

    const conflictingReservations = await Reservation.find({
      date: normalizedDate,
      timeSlot: normalizedTimeSlot,
      status: { $nin: ["Cancelled"] },
    }).select("tableId");

    const reservedTableIds = conflictingReservations.map((r) => r.tableId);

    const query = {
      isAvailable: true,
      _id: { $nin: reservedTableIds },
    };
    if (minSeatCount) {
      query.seats = { $gte: minSeatCount };
    }

    const tables = await DiningTable.find(query).sort({ seats: 1, tableNo: 1 }).lean();

    res.json(tables);
  } catch (error) {
    console.error("Get available tables error:", error);
    res.status(500).json({ message: "Server error" });
  }
}

export async function addTable(req, res) {
  try {
    const { tableNo, seats, location } = req.body;

    if (!tableNo) return res.status(400).json({ message: "Table number is required" });
    if (seats && ![2, 4, 6, 8].includes(seats)) {
      return res.status(400).json({ message: "Seats must be 2, 4, 6 or 8" });
    }
    if (location && !["indoor", "outdoor"].includes(location)) {
      return res.status(400).json({ message: "Location must be indoor or outdoor" });
    }

    const trimmedNo = String(tableNo).trim();
    const existing = await DiningTable.findOne({ tableNo: trimmedNo });
    if (existing) return res.status(409).json({ message: "Table number already exists" });

    const table = await DiningTable.create({
      tableNo: trimmedNo,
      seats: seats || 2,
      location: location || "indoor",
    });

    res.status(201).json({ message: "Table added", table });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: "Table number already exists" });
    console.error("Add table error:", error);
    res.status(500).json({ message: "Server error" });
  }
}

export async function updateTable(req, res) {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(404).json({ message: "Table not found" });
    }

    const { tableNo, seats, location, isAvailable } = req.body;
    const updates = {};

    if (tableNo !== undefined) {
      const trimmedNo = String(tableNo).trim();
      const existing = await DiningTable.findOne({ tableNo: trimmedNo, _id: { $ne: req.params.id } });
      if (existing) {
        return res.status(409).json({ message: "Table number already exists" });
      }
      updates.tableNo = trimmedNo;
    }
    if (seats !== undefined) {
      if (![2, 4, 6, 8].includes(seats)) return res.status(400).json({ message: "Seats must be 2, 4, 6 or 8" });
      updates.seats = seats;
    }
    if (location) {
      if (!["indoor", "outdoor"].includes(location)) {
        return res.status(400).json({ message: "Location must be indoor or outdoor" });
      }
      updates.location = location;
    }
    if (isAvailable !== undefined) updates.isAvailable = isAvailable;

    const table = await DiningTable.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
    if (!table) return res.status(404).json({ message: "Table not found" });

    res.json({ message: "Table updated", table });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: "Table number already exists" });
    console.error("Update table error:", error);
    res.status(500).json({ message: "Server error" });
  }
}

export async function getTableDashboard(req, res) {
  try {
    const { date } = req.query;

    const targetDate = new Date(date || new Date());
    targetDate.setUTCHours(0, 0, 0, 0);

    const tables = await DiningTable.find().sort({ tableNo: 1 }).lean();

    const reservations = await Reservation.find({
      date: targetDate,
      status: { $nin: ["Cancelled"] },
    })
      .populate("customerId", "firstName lastName")
      .sort({ timeSlot: 1 })
      .lean();

    const tablesWithReservations = tables.map((table) => {
      const tableReservations = reservations.filter(
        (r) => r.tableId.toString() === table._id.toString()
      );
      return {
        ...table,
        reservations: tableReservations,
        reservationCount: tableReservations.length,
        isFreeNow: tableReservations.length === 0,
      };
    });

    const totalTables = tables.length;
    const tablesWithBookings = tablesWithReservations.filter((t) => t.reservationCount > 0).length;
    const freeTables = totalTables - tablesWithBookings;
    const totalReservations = reservations.length;

    res.json({
      tables: tablesWithReservations,
      summary: { totalTables, tablesWithBookings, freeTables, totalReservations },
      date: targetDate,
    });
  } catch (error) {
    console.error("Table dashboard error:", error);
    res.status(500).json({ message: "Server error" });
  }
}

export async function deleteTable(req, res) {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(404).json({ message: "Table not found" });
    }

    const activeReservations = await Reservation.countDocuments({
      tableId: req.params.id,
      status: { $in: ["Pending", "Confirmed"] },
    });

    if (activeReservations > 0) {
      return res.status(400).json({ message: `Cannot delete: ${activeReservations} active reservation(s) on this table` });
    }

    const table = await DiningTable.findByIdAndDelete(req.params.id);
    if (!table) return res.status(404).json({ message: "Table not found" });

    res.json({ message: "Table deleted" });
  } catch (error) {
    console.error("Delete table error:", error);
    res.status(500).json({ message: "Server error" });
  }
}
