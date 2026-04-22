// routes/paymentRoutes.js — Payment routes
import { Router } from "express";
import requireAuth from "../middleware/requireAuth.js";
import requireAdmin from "../middleware/requireAdmin.js";
import { uploadProofImage } from "../config/cloudinary.js";
import {
  createPayment,
  uploadProof,
  getPaymentByOrder,
  requestRefund,
  listAllPayments,
  verifyPayment,
  reviewRefund,
} from "../controllers/paymentController.js";

const router = Router();

// Customer routes
router.post("/", requireAuth, createPayment);
router.post("/:id/upload-proof", requireAuth, uploadProofImage.single("proof"), uploadProof);
router.get("/order/:orderId", requireAuth, getPaymentByOrder);
router.post("/:id/refund", requireAuth, requestRefund);

// Admin routes
router.get("/admin/all", requireAuth, requireAdmin, listAllPayments);
router.patch("/admin/:id/verify", requireAuth, requireAdmin, verifyPayment);
router.patch("/admin/:id/refund-review", requireAuth, requireAdmin, reviewRefund);

export default router;
