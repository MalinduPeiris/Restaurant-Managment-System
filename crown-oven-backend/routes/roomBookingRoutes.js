import { Router } from "express";
import requireAuth from "../middleware/requireAuth.js";
import requireAdmin from "../middleware/requireAdmin.js";
import {
  createBooking, getMyBookings, cancelBooking,
  listAllBookings, updateBookingStatus,
} from "../controllers/roomBookingController.js";

const router = Router();

// Customer
router.post("/", requireAuth, createBooking);
router.get("/my", requireAuth, getMyBookings);
router.patch("/:id/cancel", requireAuth, cancelBooking);

// Admin
router.get("/admin/all", requireAuth, requireAdmin, listAllBookings);
router.patch("/admin/:id/status", requireAuth, requireAdmin, updateBookingStatus);

export default router;
