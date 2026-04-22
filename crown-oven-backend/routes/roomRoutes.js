import { Router } from "express";
import requireAuth from "../middleware/requireAuth.js";
import requireAdmin from "../middleware/requireAdmin.js";
import { uploadRoomImage } from "../config/cloudinary.js";
import { createRoom, listRooms, getRoomById, updateRoom, deleteRoom } from "../controllers/roomController.js";

const router = Router();

// Public/Customer — list available rooms
router.get("/", requireAuth, listRooms);
router.get("/:id", requireAuth, getRoomById);

// Admin — CRUD
router.post("/", requireAuth, requireAdmin, uploadRoomImage.single("image"), createRoom);
router.patch("/:id", requireAuth, requireAdmin, uploadRoomImage.single("image"), updateRoom);
router.delete("/:id", requireAuth, requireAdmin, deleteRoom);

export default router;
