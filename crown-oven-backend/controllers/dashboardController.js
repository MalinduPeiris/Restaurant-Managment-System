// controllers/dashboardController.js — Admin dashboard summary (all stats backend-calculated)
import Order from "../models/Order.js";
import Dish from "../models/Dish.js";
import User from "../models/User.js";
import Payment from "../models/Payment.js";
import DiningTable from "../models/DiningTable.js";
import Reservation from "../models/Reservation.js";
import Delivery from "../models/Delivery.js";
import Review from "../models/Review.js";
import Feedback from "../models/Feedback.js";
import Room from "../models/Room.js";
import RoomBooking from "../models/RoomBooking.js";

// GET /api/dashboard/admin — Admin: full system summary
export async function getAdminDashboard(req, res) {
  try {
    // Get today's date range
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    // Run all queries in parallel for performance
    const [
      // Orders
      totalOrders,
      pendingOrders,
      preparingOrders,
      readyOrders,
      todayOrders,
      // Revenue (from paid orders)
      revenueResult,
      todayRevenueResult,
      // Dishes
      totalDishes,
      availableDishes,
      // Users
      totalCustomers,
      totalRiders,
      // Payments
      pendingPayments,
      verifiedPayments,
      // Tables
      totalTables,
      // Reservations
      todayReservations,
      pendingReservations,
      // Deliveries
      pendingDeliveries,
      activeDeliveries,
      completedDeliveries,
      // Rooms
      totalRooms,
      availableRooms,
      pendingRoomBookings,
      confirmedRoomBookings,
      todayRoomBookings,
      // Reviews & Feedback
      totalReviews,
      totalFeedback,
      avgFeedbackResult,
    ] = await Promise.all([
      // Orders
      Order.countDocuments(),
      Order.countDocuments({ status: "Pending" }),
      Order.countDocuments({ status: "Preparing" }),
      Order.countDocuments({ status: "Ready" }),
      Order.countDocuments({ createdAt: { $gte: todayStart, $lte: todayEnd } }),
      // Revenue
      Order.aggregate([
        { $match: { paymentStatus: "paid", status: { $nin: ["Cancelled"] } } },
        { $group: { _id: null, total: { $sum: "$totalAmount" } } },
      ]),
      Order.aggregate([
        { $match: { paymentStatus: "paid", status: { $nin: ["Cancelled"] }, createdAt: { $gte: todayStart, $lte: todayEnd } } },
        { $group: { _id: null, total: { $sum: "$totalAmount" } } },
      ]),
      // Dishes
      Dish.countDocuments(),
      Dish.countDocuments({ isAvailable: true }),
      // Users
      User.countDocuments({ role: "customer" }),
      User.countDocuments({ role: "rider" }),
      // Payments
      Payment.countDocuments({ status: { $in: ["pending", "submitted"] } }),
      Payment.countDocuments({ status: "verified" }),
      // Tables
      DiningTable.countDocuments(),
      // Reservations
      Reservation.countDocuments({
        date: { $gte: todayStart, $lte: todayEnd },
        status: { $nin: ["Cancelled"] },
      }),
      Reservation.countDocuments({ status: "Pending" }),
      // Deliveries
      Delivery.countDocuments({ status: "PENDING" }),
      Delivery.countDocuments({ status: { $in: ["ASSIGNED", "ON_THE_WAY"] } }),
      Delivery.countDocuments({ status: "DELIVERED" }),
      // Rooms
      Room.countDocuments(),
      Room.countDocuments({ isAvailable: true }),
      RoomBooking.countDocuments({ status: "Pending" }),
      RoomBooking.countDocuments({ status: "Confirmed" }),
      RoomBooking.countDocuments({
        date: todayStart.toISOString().split("T")[0],
        status: { $nin: ["Cancelled", "Rejected"] },
      }),
      // Reviews & Feedback
      Review.countDocuments(),
      Feedback.countDocuments(),
      Feedback.aggregate([
        { $group: { _id: null, avg: { $avg: "$rating" } } },
      ]),
    ]);

    const totalRevenue = revenueResult[0]?.total || 0;
    const todayRevenue = todayRevenueResult[0]?.total || 0;
    const avgServiceRating = avgFeedbackResult[0]?.avg
      ? Math.round(avgFeedbackResult[0].avg * 10) / 10
      : 0;

    res.json({
      orders: {
        total: totalOrders,
        pending: pendingOrders,
        preparing: preparingOrders,
        ready: readyOrders,
        today: todayOrders,
      },
      revenue: {
        total: totalRevenue,
        today: todayRevenue,
      },
      dishes: {
        total: totalDishes,
        available: availableDishes,
        unavailable: totalDishes - availableDishes,
      },
      users: {
        customers: totalCustomers,
        riders: totalRiders,
      },
      payments: {
        pending: pendingPayments,
        verified: verifiedPayments,
      },
      tables: {
        total: totalTables,
      },
      reservations: {
        today: todayReservations,
        pending: pendingReservations,
      },
      deliveries: {
        pending: pendingDeliveries,
        active: activeDeliveries,
        completed: completedDeliveries,
      },
      rooms: {
        total: totalRooms,
        available: availableRooms,
      },
      roomBookings: {
        pending: pendingRoomBookings,
        confirmed: confirmedRoomBookings,
        today: todayRoomBookings,
      },
      reviews: {
        total: totalReviews,
      },
      feedback: {
        total: totalFeedback,
        avgRating: avgServiceRating,
      },
    });
  } catch (error) {
    console.error("Dashboard error:", error);
    res.status(500).json({ message: "Server error" });
  }
}
