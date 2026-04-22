import { Router } from "express";
import requireAuth from "../middleware/requireAuth.js";
import requireAdmin from "../middleware/requireAdmin.js";
import {
  submitFeedback,
  getMyFeedback,
  getFeedbackByOrder,
  listAllFeedback,
  replyToFeedback,
  adminDeleteFeedback,
} from "../controllers/feedbackController.js";

const router = Router();

// Customer routes
router.post("/", requireAuth, submitFeedback);
router.get("/my", requireAuth, getMyFeedback);
router.get("/order/:orderId", requireAuth, getFeedbackByOrder);

// Admin routes
router.get("/admin/all", requireAuth, requireAdmin, listAllFeedback);
router.patch("/admin/:id/reply", requireAuth, requireAdmin, replyToFeedback);
router.delete("/admin/:id", requireAuth, requireAdmin, adminDeleteFeedback);

export default router;
