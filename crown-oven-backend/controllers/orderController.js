// controllers/orderController.js - Order business logic (delivery & pickup)
import Order from "../models/Order.js";
import Dish from "../models/Dish.js";
import Delivery from "../models/Delivery.js";
import Payment from "../models/Payment.js";
import { generateOrderNumber } from "../utils/helpers.js";

function isValidObjectId(id) {
  return /^[a-f\d]{24}$/i.test(id);
}

const STATUS_TRANSITIONS = {
  delivery: { Pending: ["Preparing", "Cancelled"], Preparing: ["Ready", "Cancelled"], Ready: ["Cancelled"] },
  pickup: { Pending: ["Preparing", "Cancelled"], Preparing: ["Ready", "Cancelled"], Ready: ["Collected", "Cancelled"] },
};

export async function createOrder(req, res) {
  try {
    const { orderType, items, deliveryAddress, customerName, phone } = req.body;

    if (!["delivery", "pickup"].includes(orderType)) {
      return res.status(400).json({ message: "Invalid order type. Must be delivery or pickup" });
    }
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "Order must have at least one item" });
    }

    if (orderType === "delivery") {
      if (!deliveryAddress || !deliveryAddress.trim()) {
        return res.status(400).json({ message: "Delivery orders require a delivery address" });
      }
      if (deliveryAddress.trim().length > 300) {
        return res.status(400).json({ message: "Delivery address cannot exceed 300 characters" });
      }
    }

    if (customerName && customerName.length > 100) {
      return res.status(400).json({ message: "Customer name cannot exceed 100 characters" });
    }

    const orderItems = [];
    let totalAmount = 0;

    for (const item of items) {
      if (!item.dishId || !item.quantity || item.quantity < 1) {
        return res.status(400).json({ message: "Each item needs a dishId and quantity (min 1)" });
      }
      if (!isValidObjectId(item.dishId)) {
        return res.status(404).json({ message: `Dish not found: ${item.dishId}` });
      }
      if (item.quantity > 20) {
        return res.status(400).json({ message: "Maximum 20 of each item per order" });
      }

      const dish = await Dish.findById(item.dishId);
      if (!dish) return res.status(404).json({ message: `Dish not found: ${item.dishId}` });
      if (!dish.isAvailable) return res.status(400).json({ message: `${dish.name} is currently unavailable` });

      orderItems.push({
        dishId: dish._id,
        name: dish.name,
        price: dish.price,
        quantity: item.quantity,
      });

      totalAmount += dish.price * item.quantity;
    }

    const order = await Order.create({
      orderNumber: generateOrderNumber(),
      customerId: req.user.id,
      orderType,
      items: orderItems,
      totalAmount,
      deliveryAddress: orderType === "delivery" ? deliveryAddress.trim() : undefined,
      customerName: customerName || `${req.user.firstName} ${req.user.lastName}`,
      phone: phone || "",
    });

    res.status(201).json({ message: "Order placed successfully", order });
  } catch (error) {
    console.error("Create order error:", error);
    res.status(500).json({ message: "Server error" });
  }
}

export async function getMyOrders(req, res) {
  try {
    const orders = await Order.find({ customerId: req.user.id })
      .sort({ createdAt: -1 })
      .lean();

    const orderIds = orders.map((o) => o._id);
    const payments = await Payment.find({ orderId: { $in: orderIds } })
      .select("orderId status refundStatus")
      .lean();
    const paymentByOrderId = new Map(payments.map((p) => [p.orderId.toString(), p]));
    const enriched = orders.map((o) => ({
      ...o,
      hasPayment: paymentByOrderId.has(o._id.toString()),
      paymentRecordStatus: paymentByOrderId.get(o._id.toString())?.status || null,
      paymentRefundStatus: paymentByOrderId.get(o._id.toString())?.refundStatus || "none",
    }));

    res.json(enriched);
  } catch (error) {
    console.error("Get my orders error:", error);
    res.status(500).json({ message: "Server error" });
  }
}

export async function getOrderById(req, res) {
  try {
    if (!isValidObjectId(req.params.id)) return res.status(404).json({ message: "Order not found" });

    const order = await Order.findById(req.params.id).lean();
    if (!order) return res.status(404).json({ message: "Order not found" });

    if (req.user.role !== "admin" && order.customerId.toString() !== req.user.id) {
      return res.status(403).json({ message: "Access denied" });
    }
    res.json(order);
  } catch (error) {
    console.error("Get order error:", error);
    res.status(500).json({ message: "Server error" });
  }
}

export async function cancelOrder(req, res) {
  try {
    if (!isValidObjectId(req.params.id)) return res.status(404).json({ message: "Order not found" });

    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found" });

    if (req.user.role !== "admin" && order.customerId.toString() !== req.user.id) {
      return res.status(403).json({ message: "Access denied" });
    }

    if (["Delivered", "Collected", "Cancelled"].includes(order.status)) {
      return res.status(400).json({ message: `Cannot cancel order with status: ${order.status}` });
    }

    const payment = await Payment.findOne({ orderId: order._id });
    if (payment?.status === "verified" && payment.refundStatus !== "approved") {
      return res.status(400).json({ message: "Cannot cancel a paid order. Request a refund first." });
    }

    order.status = "Cancelled";
    await order.save();

    await Delivery.findOneAndDelete({ orderId: order._id });
    res.json({ message: "Order cancelled", order });
  } catch (error) {
    console.error("Cancel order error:", error);
    res.status(500).json({ message: "Server error" });
  }
}

export async function listAllOrders(req, res) {
  try {
    const { status, orderType } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (orderType) filter.orderType = orderType;

    const orders = await Order.find(filter)
      .sort({ createdAt: -1 })
      .lean();
    res.json(orders);
  } catch (error) {
    console.error("List all orders error:", error);
    res.status(500).json({ message: "Server error" });
  }
}

export async function updateOrderStatus(req, res) {
  try {
    if (!isValidObjectId(req.params.id)) return res.status(404).json({ message: "Order not found" });

    const { status } = req.body;
    const validStatuses = ["Pending", "Preparing", "Ready", "Delivered", "Collected", "Cancelled"];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: `Invalid status. Must be one of: ${validStatuses.join(", ")}` });
    }

    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found" });

    if (["Delivered", "Collected", "Cancelled"].includes(order.status)) {
      return res.status(400).json({ message: `Cannot update order with status: ${order.status}` });
    }

    const allowed = STATUS_TRANSITIONS[order.orderType]?.[order.status] || [];
    if (!allowed.includes(status)) {
      return res.status(400).json({
        message: `Cannot change ${order.orderType} order from "${order.status}" to "${status}". Allowed: ${allowed.join(", ")}`,
      });
    }

    if (order.status === "Pending" && status === "Preparing") {
      const payment = await Payment.findOne({ orderId: order._id });
      if (!payment) {
        return res.status(400).json({ message: "Cannot prepare order. No payment has been made yet." });
      }
      if (payment.status !== "verified") {
        return res.status(400).json({ message: "Cannot prepare order. Payment has not been accepted yet." });
      }
    }

    order.status = status;
    await order.save();

    if (status === "Ready" && order.orderType === "delivery") {
      const existingDelivery = await Delivery.findOne({ orderId: order._id });
      if (!existingDelivery) {
        await Delivery.create({
          orderId: order._id,
          deliveryAddress: order.deliveryAddress,
          customerName: order.customerName,
          customerPhone: order.phone || "",
        });
      }
    }

    res.json({ message: `Order status updated to ${status}`, order });
  } catch (error) {
    console.error("Update order status error:", error);
    res.status(500).json({ message: "Server error" });
  }
}

export async function deleteOrder(req, res) {
  try {
    if (!isValidObjectId(req.params.id)) return res.status(404).json({ message: "Order not found" });

    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found" });

    if (order.status !== "Cancelled") {
      return res.status(400).json({ message: "Only cancelled orders can be deleted" });
    }

    await Delivery.deleteOne({ orderId: order._id });
    await Payment.deleteOne({ orderId: order._id });
    await Order.deleteOne({ _id: order._id });

    res.json({ message: "Cancelled order deleted successfully" });
  } catch (error) {
    console.error("Delete order error:", error);
    res.status(500).json({ message: "Server error" });
  }
}
