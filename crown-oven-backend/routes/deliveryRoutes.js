import { Router } from "express";
import requireAuth from "../middleware/requireAuth.js";
import requireAdmin from "../middleware/requireAdmin.js";
import requireRider from "../middleware/requireRider.js";
import {
  listAllDeliveries,
  assignRider,
  getMyDeliveries,
  updateDeliveryStatus,
  getDeliveryByOrder,
} from "../controllers/deliveryController.js";

const router = Router();

// Admin routes
router.get("/admin/all", requireAuth, requireAdmin, listAllDeliveries);
router.patch("/admin/:id/assign", requireAuth, requireAdmin, assignRider);

// Rider routes
router.get("/rider/my", requireAuth, requireRider, getMyDeliveries);
router.patch("/rider/:id/status", requireAuth, requireRider, updateDeliveryStatus);

// Customer/Admin route (any authenticated user can check their order's delivery)
router.get("/order/:orderId", requireAuth, getDeliveryByOrder);

export default router;
