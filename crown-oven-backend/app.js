import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import authenticateUser from "./middleware/auth.js";
import authRoutes from "./routes/authRoutes.js";
import dishRoutes from "./routes/dishRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import tableRoutes from "./routes/tableRoutes.js";
import reviewRoutes from "./routes/reviewRoutes.js";
import reservationRoutes from "./routes/reservationRoutes.js";
import deliveryRoutes from "./routes/deliveryRoutes.js";
import feedbackRoutes from "./routes/feedbackRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import amenityRoutes from "./routes/amenityRoutes.js";
import roomRoutes from "./routes/roomRoutes.js";
import roomBookingRoutes from "./routes/roomBookingRoutes.js";

const app = express();

app.use(express.json({ limit: "15mb" }));

app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { message: "Too many attempts. Try again after 15 minutes." },
});
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);

app.use(authenticateUser);

app.use("/api/auth", authRoutes);
app.use("/api/dishes", dishRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/tables", tableRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/reservations", reservationRoutes);
app.use("/api/deliveries", deliveryRoutes);
app.use("/api/feedback", feedbackRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/amenities", amenityRoutes);
app.use("/api/rooms", roomRoutes);
app.use("/api/room-bookings", roomBookingRoutes);

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "Crown Oven API is running" });
});

app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: "Internal server error" });
});

export default app;
