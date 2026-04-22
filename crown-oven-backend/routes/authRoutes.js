// routes/authRoutes.js — Authentication and user management routes
import { Router } from "express";
import requireAuth from "../middleware/requireAuth.js";
import requireAdmin from "../middleware/requireAdmin.js";
import { uploadAvatar } from "../config/cloudinary.js";
import {
  register,
  login,
  getProfile,
  updateProfile,
  changePassword,
  uploadAvatar as uploadAvatarHandler,
  listUsers,
  updateUser,
  deleteUser,
  createRider,
  listRiders,
} from "../controllers/authController.js";

const router = Router();

// Public routes
router.post("/register", register);
router.post("/login", login);

// Protected routes (logged-in users)
router.get("/profile", requireAuth, getProfile);
router.patch("/profile", requireAuth, updateProfile);
router.post("/change-password", requireAuth, changePassword);
router.post("/upload-avatar", requireAuth, uploadAvatar.single("image"), uploadAvatarHandler);

// Admin routes
router.get("/admin/users", requireAuth, requireAdmin, listUsers);
router.patch("/admin/users/:id", requireAuth, requireAdmin, updateUser);
router.delete("/admin/users/:id", requireAuth, requireAdmin, deleteUser);

// Rider management (admin only)
router.post("/admin/create-rider", requireAuth, requireAdmin, createRider);
router.get("/admin/riders", requireAuth, requireAdmin, listRiders);

export default router;
