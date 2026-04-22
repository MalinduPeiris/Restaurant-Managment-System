// routes/reservationRoutes.js — Reservation routes
import { Router } from "express";
import requireAuth from "../middleware/requireAuth.js";
import requireAdmin from "../middleware/requireAdmin.js";
import {
  createReservation,
  getMyReservations,
  cancelReservation,
  listAllReservations,
  updateReservationStatus,
  getAvailableTablesForReservation,
} from "../controllers/reservationController.js";

const router = Router();

// Customer routes
router.post("/", requireAuth, createReservation);
router.get("/my", requireAuth, getMyReservations);
router.patch("/:id/cancel", requireAuth, cancelReservation);
router.get("/available", requireAuth, getAvailableTablesForReservation);

// Admin routes
router.get("/admin/all", requireAuth, requireAdmin, listAllReservations);
router.patch("/admin/:id/status", requireAuth, requireAdmin, updateReservationStatus);

export default router;
