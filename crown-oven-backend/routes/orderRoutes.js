// routes/orderRoutes.js - Order routes
import { Router } from "express";
import requireAuth from "../middleware/requireAuth.js";
import requireAdmin from "../middleware/requireAdmin.js";
import {
  createOrder,
  getMyOrders,
  getOrderById,
  cancelOrder,
  listAllOrders,
  updateOrderStatus,
  deleteOrder,
} from "../controllers/orderController.js";

const router = Router();

// Admin routes
router.get("/admin/all", requireAuth, requireAdmin, listAllOrders);
router.patch("/admin/:id/status", requireAuth, requireAdmin, updateOrderStatus);
router.delete("/admin/:id", requireAuth, requireAdmin, deleteOrder);

// Customer routes
router.post("/", requireAuth, createOrder);
router.get("/my", requireAuth, getMyOrders);
router.get("/:id", requireAuth, getOrderById);
router.patch("/:id/cancel", requireAuth, cancelOrder);

export default router;
