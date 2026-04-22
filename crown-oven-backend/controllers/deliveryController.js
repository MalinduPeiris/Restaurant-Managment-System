// controllers/deliveryController.js - Delivery management logic
// All business logic, validations, and status transitions enforced here (backend)
import Delivery from "../models/Delivery.js";
import Order from "../models/Order.js";
import User from "../models/User.js";

function isValidObjectId(id) {
  return /^[a-f\d]{24}$/i.test(id);
}

function attachDeliveryMetrics(delivery) {
  if (!delivery) return delivery;

  const pickedUpAt = delivery.pickedUpAt ? new Date(delivery.pickedUpAt) : null;
  const deliveredAt = delivery.deliveredAt ? new Date(delivery.deliveredAt) : null;

  let deliveryDurationMinutes = null;
  if (pickedUpAt && deliveredAt && deliveredAt >= pickedUpAt) {
    deliveryDurationMinutes = Math.round((deliveredAt - pickedUpAt) / 60000);
  }

  return {
    ...delivery,
    deliveryStartTime: delivery.pickedUpAt || null,
    deliveryEndTime: delivery.deliveredAt || null,
    deliveryDurationMinutes,
  };
}

// Valid status transitions (backend-enforced state machine)
const DELIVERY_TRANSITIONS = {
  PENDING: ["ASSIGNED"],
  ASSIGNED: ["ON_THE_WAY"],
  ON_THE_WAY: ["DELIVERED"],
};

// GET /api/deliveries/admin/all - Admin: list all deliveries
export async function listAllDeliveries(req, res) {
  try {
    const { status } = req.query;
    const filter = {};
    if (status) {
      if (!["PENDING", "ASSIGNED", "ON_THE_WAY", "DELIVERED"].includes(status)) {
        return res.status(400).json({ message: "Invalid status filter" });
      }
      filter.status = status;
    }

    const deliveries = await Delivery.find(filter)
      .populate("orderId", "orderNumber totalAmount orderType status")
      .populate("riderId", "firstName lastName phone")
      .sort({ createdAt: -1 })
      .lean();

    res.json(deliveries.map(attachDeliveryMetrics));
  } catch (error) {
    console.error("List deliveries error:", error);
    res.status(500).json({ message: "Server error" });
  }
}

// PATCH /api/deliveries/admin/:id/assign - Admin: assign rider to delivery
export async function assignRider(req, res) {
  try {
    const { riderId } = req.body;

    if (!riderId) {
      return res.status(400).json({ message: "riderId is required" });
    }
    if (!isValidObjectId(riderId) || !isValidObjectId(req.params.id)) {
      return res.status(404).json({ message: "Delivery or rider not found" });
    }

    const rider = await User.findById(riderId);
    if (!rider) return res.status(404).json({ message: "Rider not found" });
    if (rider.role !== "rider") {
      return res.status(400).json({ message: "Selected user is not a rider" });
    }
    if (rider.isBlocked) {
      return res.status(400).json({ message: "Rider is blocked" });
    }

    const delivery = await Delivery.findById(req.params.id);
    if (!delivery) return res.status(404).json({ message: "Delivery not found" });

    const order = await Order.findById(delivery.orderId).select("status");
    if (!order) {
      return res.status(404).json({ message: "Associated order not found" });
    }
    if (order.status !== "Ready") {
      return res.status(400).json({ message: `Cannot assign rider for order status: ${order.status}` });
    }

    if (delivery.status !== "PENDING") {
      return res.status(400).json({
        message: `Cannot assign rider. Delivery status is "${delivery.status}", must be "PENDING"`,
      });
    }

    delivery.riderId = riderId;
    delivery.status = "ASSIGNED";
    delivery.assignedAt = new Date();
    await delivery.save();

    const populated = await Delivery.findById(delivery._id)
      .populate("orderId", "orderNumber totalAmount orderType status")
      .populate("riderId", "firstName lastName phone")
      .lean();

    res.json({ message: "Rider assigned successfully", delivery: attachDeliveryMetrics(populated) });
  } catch (error) {
    console.error("Assign rider error:", error);
    res.status(500).json({ message: "Server error" });
  }
}

// GET /api/deliveries/rider/my - Rider: get my assigned deliveries
export async function getMyDeliveries(req, res) {
  try {
    const deliveries = await Delivery.find({ riderId: req.user.id })
      .populate("orderId", "orderNumber totalAmount orderType items status")
      .sort({ createdAt: -1 })
      .lean();

    res.json(deliveries.map(attachDeliveryMetrics));
  } catch (error) {
    console.error("Get my deliveries error:", error);
    res.status(500).json({ message: "Server error" });
  }
}

// PATCH /api/deliveries/rider/:id/status - Rider: update delivery status
export async function updateDeliveryStatus(req, res) {
  try {
    const { status } = req.body;

    if (!["ON_THE_WAY", "DELIVERED"].includes(status)) {
      return res.status(400).json({ message: "Rider can only set status to ON_THE_WAY or DELIVERED" });
    }
    if (!isValidObjectId(req.params.id)) {
      return res.status(404).json({ message: "Delivery not found" });
    }

    const delivery = await Delivery.findById(req.params.id);
    if (!delivery) return res.status(404).json({ message: "Delivery not found" });

    const order = await Order.findById(delivery.orderId);
    if (!order) {
      return res.status(404).json({ message: "Associated order not found" });
    }
    if (order.status === "Cancelled") {
      return res.status(400).json({ message: "Cannot update delivery for a cancelled order" });
    }

    if (!delivery.riderId || delivery.riderId.toString() !== req.user.id) {
      return res.status(403).json({ message: "This delivery is not assigned to you" });
    }

    const allowed = DELIVERY_TRANSITIONS[delivery.status] || [];
    if (!allowed.includes(status)) {
      return res.status(400).json({
        message: `Cannot change from "${delivery.status}" to "${status}". Allowed: ${allowed.join(", ")}`,
      });
    }

    delivery.status = status;

    if (status === "ON_THE_WAY") {
      delivery.pickedUpAt = new Date();
    }

    if (status === "DELIVERED") {
      delivery.deliveredAt = new Date();

      if (! ["Delivered", "Cancelled"].includes(order.status)) {
        order.status = "Delivered";
        await order.save();
      }
    }

    await delivery.save();

    const populated = await Delivery.findById(delivery._id)
      .populate("orderId", "orderNumber totalAmount orderType status")
      .populate("riderId", "firstName lastName phone")
      .lean();

    res.json({ message: `Delivery status updated to ${status}`, delivery: attachDeliveryMetrics(populated) });
  } catch (error) {
    console.error("Update delivery status error:", error);
    res.status(500).json({ message: "Server error" });
  }
}

// GET /api/deliveries/order/:orderId - Customer/Admin: get delivery info for an order
export async function getDeliveryByOrder(req, res) {
  try {
    if (!isValidObjectId(req.params.orderId)) {
      return res.status(404).json({ message: "Order not found" });
    }

    const order = await Order.findById(req.params.orderId);
    if (!order) return res.status(404).json({ message: "Order not found" });

    if (req.user.role !== "admin" && order.customerId.toString() !== req.user.id) {
      return res.status(403).json({ message: "Access denied" });
    }

    const delivery = await Delivery.findOne({ orderId: req.params.orderId })
      .populate("riderId", "firstName lastName phone")
      .lean();

    if (!delivery) {
      return res.status(404).json({ message: "No delivery found for this order" });
    }

    res.json(attachDeliveryMetrics(delivery));
  } catch (error) {
    console.error("Get delivery by order error:", error);
    res.status(500).json({ message: "Server error" });
  }
}
