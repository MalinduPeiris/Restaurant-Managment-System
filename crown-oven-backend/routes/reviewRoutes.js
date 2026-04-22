// routes/reviewRoutes.js — Review routes
import { Router } from "express";
import requireAuth from "../middleware/requireAuth.js";
import requireAdmin from "../middleware/requireAdmin.js";
import {
  createReview,
  getDishReviews,
  getMyReviews,
  updateReview,
  deleteReview,
  listAllReviews,
  adminDeleteReview,
} from "../controllers/reviewController.js";

const router = Router();

// Public route
router.get("/dish/:dishId", getDishReviews);

// Customer routes
router.post("/", requireAuth, createReview);
router.get("/my", requireAuth, getMyReviews);
router.patch("/:id", requireAuth, updateReview);
router.delete("/:id", requireAuth, deleteReview);

// Admin routes
router.get("/admin/all", requireAuth, requireAdmin, listAllReviews);
router.delete("/admin/:id", requireAuth, requireAdmin, adminDeleteReview);

export default router;
