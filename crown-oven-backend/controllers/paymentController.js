// controllers/paymentController.js - Payment logic with validation
import Payment from "../models/Payment.js";
import Order from "../models/Order.js";
import { generatePaymentId } from "../utils/helpers.js";

function isValidObjectId(id) {
  return /^[a-f\d]{24}$/i.test(id);
}

export async function createPayment(req, res) {
  try {
    const { orderId, paymentMethod } = req.body;

    if (!orderId || !paymentMethod) {
      return res.status(400).json({ message: "orderId and paymentMethod are required" });
    }
    if (!isValidObjectId(orderId)) {
      return res.status(404).json({ message: "Order not found" });
    }
    if (!["cash", "bank_transfer"].includes(paymentMethod)) {
      return res.status(400).json({ message: "Payment method must be cash or bank_transfer" });
    }

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: "Order not found" });

    if (order.orderType === "pickup" && paymentMethod !== "cash") {
      return res.status(400).json({ message: "Takeaway orders only support cash payment" });
    }
    if (order.orderType === "delivery" && !["cash", "bank_transfer"].includes(paymentMethod)) {
      return res.status(400).json({ message: "Delivery orders support cash on delivery or bank_transfer" });
    }

    if (order.customerId.toString() !== req.user.id) {
      return res.status(403).json({ message: "You can only pay for your own orders" });
    }
    if (order.status === "Cancelled") {
      return res.status(400).json({ message: "Cannot pay for a cancelled order" });
    }

    const existingPayment = await Payment.findOne({ orderId });
    if (existingPayment) {
      if (existingPayment.status !== "rejected") {
        return res.status(409).json({ message: "Payment already exists for this order" });
      }

      existingPayment.paymentId = generatePaymentId();
      existingPayment.paymentMethod = paymentMethod;
      existingPayment.amount = order.totalAmount;
      existingPayment.status = "pending";
      existingPayment.proofImageUrl = "";
      existingPayment.refundStatus = "none";
      existingPayment.refundRequestedAt = undefined;
      existingPayment.refundReviewedBy = undefined;
      await existingPayment.save();

      return res.status(201).json({ message: "Payment restarted", payment: existingPayment });
    }

    const payment = await Payment.create({
      paymentId: generatePaymentId(),
      orderId: order._id,
      customerId: req.user.id,
      amount: order.totalAmount,
      paymentMethod,
      status: "pending",
    });

    res.status(201).json({ message: "Payment created", payment });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: "Payment already exists for this order" });
    console.error("Create payment error:", error);
    res.status(500).json({ message: "Server error" });
  }
}

export async function uploadProof(req, res) {
  try {
    if (!req.file) return res.status(400).json({ message: "No proof image provided" });
    if (!isValidObjectId(req.params.id)) return res.status(404).json({ message: "Payment not found" });

    const payment = await Payment.findById(req.params.id);
    if (!payment) return res.status(404).json({ message: "Payment not found" });

    if (payment.customerId.toString() !== req.user.id) {
      return res.status(403).json({ message: "Access denied" });
    }
    if (payment.paymentMethod !== "bank_transfer") {
      return res.status(400).json({ message: "Proof upload is only for bank transfers" });
    }

    payment.proofImageUrl = req.file.path;
    payment.status = "submitted";
    await payment.save();

    res.json({ message: "Payment proof uploaded", payment });
  } catch (error) {
    console.error("Upload proof error:", error);
    res.status(500).json({ message: "Server error" });
  }
}

export async function getPaymentByOrder(req, res) {
  try {
    if (!isValidObjectId(req.params.orderId)) {
      return res.status(404).json({ message: "Payment not found for this order" });
    }

    const payment = await Payment.findOne({ orderId: req.params.orderId })
      .populate("orderId", "orderNumber totalAmount status")
      .lean();

    if (!payment) return res.status(404).json({ message: "Payment not found for this order" });

    if (req.user.role !== "admin" && payment.customerId.toString() !== req.user.id) {
      return res.status(403).json({ message: "Access denied" });
    }

    res.json(payment);
  } catch (error) {
    console.error("Get payment error:", error);
    res.status(500).json({ message: "Server error" });
  }
}

export async function requestRefund(req, res) {
  try {
    if (!isValidObjectId(req.params.id)) return res.status(404).json({ message: "Payment not found" });

    const payment = await Payment.findById(req.params.id);
    if (!payment) return res.status(404).json({ message: "Payment not found" });

    if (payment.customerId.toString() !== req.user.id) {
      return res.status(403).json({ message: "Access denied" });
    }
    if (payment.status !== "verified") {
      return res.status(400).json({ message: "Can only request refund for verified payments" });
    }
    if (payment.refundStatus !== "none") {
      return res.status(400).json({ message: `Refund already ${payment.refundStatus}` });
    }

    payment.refundStatus = "requested";
    payment.refundRequestedAt = new Date();
    await payment.save();

    res.json({ message: "Refund requested", payment });
  } catch (error) {
    console.error("Request refund error:", error);
    res.status(500).json({ message: "Server error" });
  }
}

export async function listAllPayments(req, res) {
  try {
    const { status, refundStatus } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (refundStatus) filter.refundStatus = refundStatus;

    const payments = await Payment.find(filter)
      .populate("orderId", "orderNumber orderType totalAmount status")
      .populate("customerId", "firstName lastName email")
      .sort({ createdAt: -1 })
      .lean();

    res.json(payments);
  } catch (error) {
    console.error("List payments error:", error);
    res.status(500).json({ message: "Server error" });
  }
}

export async function verifyPayment(req, res) {
  try {
    const { action } = req.body;
    if (!["verify", "reject"].includes(action)) {
      return res.status(400).json({ message: "Action must be 'verify' or 'reject'" });
    }
    if (!isValidObjectId(req.params.id)) return res.status(404).json({ message: "Payment not found" });

    const payment = await Payment.findById(req.params.id);
    if (!payment) return res.status(404).json({ message: "Payment not found" });

    if (payment.status !== "submitted" && payment.status !== "pending") {
      return res.status(400).json({ message: `Cannot verify payment with status: ${payment.status}` });
    }

    if (action === "verify") {
      const order = await Order.findById(payment.orderId);
      if (!order) {
        return res.status(404).json({ message: "Associated order not found" });
      }
      if (order.status === "Cancelled") {
        return res.status(400).json({ message: "Cannot verify payment for a cancelled order" });
      }
      if (payment.amount !== order.totalAmount) {
        return res.status(400).json({
          message: `Payment amount (${payment.amount}) does not match order total (${order.totalAmount})`,
        });
      }

      payment.status = "verified";
      order.paymentStatus = "paid";
      await order.save();
    } else {
      payment.status = "rejected";
    }
    await payment.save();

    res.json({ message: `Payment ${action === "verify" ? "verified" : "rejected"}`, payment });
  } catch (error) {
    console.error("Verify payment error:", error);
    res.status(500).json({ message: "Server error" });
  }
}

export async function reviewRefund(req, res) {
  try {
    const { action } = req.body;
    if (!["approve", "reject"].includes(action)) {
      return res.status(400).json({ message: "Action must be 'approve' or 'reject'" });
    }
    if (!isValidObjectId(req.params.id)) return res.status(404).json({ message: "Payment not found" });

    const payment = await Payment.findById(req.params.id);
    if (!payment) return res.status(404).json({ message: "Payment not found" });

    if (payment.refundStatus !== "requested") {
      return res.status(400).json({ message: "No refund request pending" });
    }

    payment.refundStatus = action === "approve" ? "approved" : "rejected";
    payment.refundReviewedBy = req.user.id;
    await payment.save();

    if (action === "approve") {
      const order = await Order.findById(payment.orderId);
      if (order) {
        order.paymentStatus = "unpaid";
        await order.save();
      }
    }

    res.json({ message: `Refund ${action}d`, payment });
  } catch (error) {
    console.error("Review refund error:", error);
    res.status(500).json({ message: "Server error" });
  }
}


