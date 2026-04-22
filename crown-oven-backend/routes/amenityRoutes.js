import { Router } from "express";
import requireAuth from "../middleware/requireAuth.js";
import requireAdmin from "../middleware/requireAdmin.js";
import { createAmenity, listAmenities, updateAmenity } from "../controllers/amenityController.js";

const router = Router();

router.get("/", requireAuth, listAmenities);
router.post("/", requireAuth, requireAdmin, createAmenity);
router.patch("/:id", requireAuth, requireAdmin, updateAmenity);

export default router;
