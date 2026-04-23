// controllers/feedbackController.js - Service feedback logic
// ALL business logic, validations enforced on backend
import Feedback from "../models/Feedback.js";
import Order from "../models/Order.js";

function isValidObjectId(id) {
  return /^[a-f\d]{24}$/i.test(id);
}

function parseRating(value) {
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : NaN;
}

// POST /api/feedback - Customer: submit feedback for an order
export async function submitFeedback(req, res) {
  try {
    const { orderId, comment } = req.body;
    const rating = parseRating(req.body.rating);

    if (!orderId || req.body.rating === undefined || req.body.rating === null) {
      return res.status(400).json({ message: "orderId and rating are required" });
    }
    if (!isValidObjectId(orderId)) {
      return res.status(404).json({ message: "Order not found" });
    }
    if (Number.isNaN(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ message: "Rating must be an integer between 1 and 5" });
    }
    if (comment && comment.length > 300) {
      return res.status(400).json({ message: "Comment cannot exceed 300 characters" });
    }

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: "Order not found" });

    if (order.customerId.toString() !== req.user.id) {
      return res.status(403).json({ message: "You can only submit feedback for your own orders" });
    }

    if (!["Delivered", "Collected"].includes(order.status)) {
      return res.status(400).json({ message: "Feedback can only be submitted for delivered or collected orders" });
    }

    const existing = await Feedback.findOne({ orderId });
    if (existing) {
      return res.status(409).json({ message: "You already submitted feedback for this order" });
    }

    const feedback = await Feedback.create({
      orderId,
      customerId: req.user.id,
      customerName: `${req.user.firstName} ${req.user.lastName}`,
      rating,
      comment: comment?.trim() || "",
    });

    res.status(201).json({ message: "Feedback submitted", feedback });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: "Feedback already submitted for this order" });
    console.error("Submit feedback error:", error);
    res.status(500).json({ message: "Server error" });
  }
}

// GET /api/feedback/my - Customer: get my feedback history
export async function getMyFeedback(req, res) {
  try {
    const feedback = await Feedback.find({ customerId: req.user.id })
      .populate("orderId", "orderNumber orderType totalAmount")
      .sort({ createdAt: -1 })
      .lean();
    res.json(feedback);
  } catch (error) {
    console.error("Get my feedback error:", error);
    res.status(500).json({ message: "Server error" });
  }
}

// GET /api/feedback/order/:orderId - Customer: check if feedback exists for order
export async function getFeedbackByOrder(req, res) {
  try {
    if (!isValidObjectId(req.params.orderId)) {
      return res.status(404).json({ message: "Order not found" });
    }

    const order = await Order.findById(req.params.orderId);
    if (!order) return res.status(404).json({ message: "Order not found" });

    if (req.user.role !== "admin" && order.customerId.toString() !== req.user.id) {
      return res.status(403).json({ message: "Access denied" });
    }

    const feedback = await Feedback.findOne({ orderId: req.params.orderId }).lean();
    res.json({ feedback: feedback || null });
  } catch (error) {
    console.error("Get feedback by order error:", error);
    res.status(500).json({ message: "Server error" });
  }
}

// GET /api/feedback/admin/all - Admin: list all feedback
export async function listAllFeedback(req, res) {
  try {
    const feedback = await Feedback.find()
      .populate("orderId", "orderNumber orderType totalAmount")
      .sort({ createdAt: -1 })
      .lean();
    res.json(feedback);
  } catch (error) {
    console.error("List all feedback error:", error);
    res.status(500).json({ message: "Server error" });
  }
}

// PATCH /api/feedback/admin/:id/reply - Admin: reply to feedback
export async function replyToFeedback(req, res) {
  try {
    const { reply } = req.body;

    if (!reply || !reply.trim()) {
      return res.status(400).json({ message: "Reply is required" });
    }
    if (reply.length > 300) {
      return res.status(400).json({ message: "Reply cannot exceed 300 characters" });
    }
    if (!isValidObjectId(req.params.id)) {
      return res.status(404).json({ message: "Feedback not found" });
    }

    const feedback = await Feedback.findById(req.params.id);
    if (!feedback) return res.status(404).json({ message: "Feedback not found" });

    const isEdit = !!feedback.adminReply;
    feedback.adminReply = reply.trim();
    feedback.adminReplyUpdatedAt = new Date();
    await feedback.save();

    res.json({ message: isEdit ? "Reply updated" : "Reply added", feedback });
  } catch (error) {
    console.error("Reply to feedback error:", error);
    res.status(500).json({ message: "Server error" });
  }
}

// DELETE /api/feedback/admin/:id - Admin: delete feedback
export async function adminDeleteFeedback(req, res) {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(404).json({ message: "Feedback not found" });
    }

    const feedback = await Feedback.findById(req.params.id);
    if (!feedback) return res.status(404).json({ message: "Feedback not found" });

    await feedback.deleteOne();
    res.json({ message: "Feedback deleted" });
  } catch (error) {
    console.error("Admin delete feedback error:", error);
    res.status(500).json({ message: "Server error" });
  }
}
