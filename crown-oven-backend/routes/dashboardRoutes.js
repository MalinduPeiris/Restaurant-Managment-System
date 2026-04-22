import { Router } from "express";
import requireAuth from "../middleware/requireAuth.js";
import requireAdmin from "../middleware/requireAdmin.js";
import { getAdminDashboard } from "../controllers/dashboardController.js";

const router = Router();

router.get("/admin", requireAuth, requireAdmin, getAdminDashboard);

export default router;
