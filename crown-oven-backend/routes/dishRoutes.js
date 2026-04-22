// routes/dishRoutes.js - Dish/catalog routes
import { Router } from "express";
import requireAuth from "../middleware/requireAuth.js";
import requireAdmin from "../middleware/requireAdmin.js";
import { uploadDishImage } from "../config/cloudinary.js";
import {
  listPublicDishes,
  listAdminDishes,
  getDishById,
  addDish,
  updateDish,
  deleteDish,
} from "../controllers/dishController.js";

const router = Router();

function maybeUploadDishImage(req, res, next) {
  if (!req.is("multipart/form-data")) {
    return next();
  }

  uploadDishImage.single("image")(req, res, (err) => {
    if (err) {
      console.error("Dish upload middleware error:", err);
      return res.status(400).json({ message: err.message || "Dish image upload failed" });
    }
    return next();
  });
}

// Admin routes
router.get("/admin/all", requireAuth, requireAdmin, listAdminDishes);
router.post("/admin", requireAuth, requireAdmin, maybeUploadDishImage, addDish);
router.patch("/admin/:id", requireAuth, requireAdmin, maybeUploadDishImage, updateDish);
router.delete("/admin/:id", requireAuth, requireAdmin, deleteDish);

// Public routes (no auth needed)
router.get("/", listPublicDishes);
router.get("/:id", getDishById);

export default router;
