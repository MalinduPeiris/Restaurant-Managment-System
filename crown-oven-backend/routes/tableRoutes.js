// routes/tableRoutes.js - Table routes
import { Router } from "express";
import requireAuth from "../middleware/requireAuth.js";
import requireAdmin from "../middleware/requireAdmin.js";
import {
  listTables,
  getAvailableTables,
  getTableDashboard,
  addTable,
  updateTable,
  deleteTable,
} from "../controllers/tableController.js";

const router = Router();

router.get("/", requireAuth, listTables);
router.get("/available", requireAuth, getAvailableTables);
router.get("/dashboard", requireAuth, requireAdmin, getTableDashboard);

router.post("/admin", requireAuth, requireAdmin, addTable);
router.patch("/admin/:id", requireAuth, requireAdmin, updateTable);
router.delete("/admin/:id", requireAuth, requireAdmin, deleteTable);

export default router;
