// controllers/reviewController.js - Review logic with rating aggregation
import Review from "../models/Review.js";
import Dish from "../models/Dish.js";
import Order from "../models/Order.js";

function isValidObjectId(id) {
  return /^[a-f\d]{24}$/i.test(id);
}

function parseRating(value) {
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : NaN;
}

// Helper: recalculate dish average rating using MongoDB aggregation
async function refreshDishRating(dishId) {
  const result = await Review.aggregate([
    { $match: { dishId: dishId } },
    {
      $group: {
        _id: "$dishId",
        averageRating: { $avg: "$rating" },
        ratingCount: { $sum: 1 },
      },
    },
  ]);

  if (result.length > 0) {
    await Dish.findByIdAndUpdate(dishId, {
      averageRating: Math.round(result[0].averageRating * 10) / 10,
      ratingCount: result[0].ratingCount,
    });
  } else {
    await Dish.findByIdAndUpdate(dishId, { averageRating: 0, ratingCount: 0 });
  }
}

// POST /api/reviews - Customer: create review
export async function createReview(req, res) {
  try {
    const { dishId, comment } = req.body;
    const rating = parseRating(req.body.rating);

    if (!dishId || req.body.rating === undefined || req.body.rating === null) {
      return res.status(400).json({ message: "dishId and rating are required" });
    }
    if (!isValidObjectId(dishId)) {
      return res.status(404).json({ message: "Dish not found" });
    }
    if (Number.isNaN(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ message: "Rating must be an integer between 1 and 5" });
    }
    if (comment && comment.length > 220) {
      return res.status(400).json({ message: "Comment cannot exceed 220 characters" });
    }

    const dish = await Dish.findById(dishId);
    if (!dish) return res.status(404).json({ message: "Dish not found" });

    const hasCompletedOrder = await Order.findOne({
      customerId: req.user.id,
      "items.dishId": dishId,
      status: { $in: ["Delivered", "Collected"] },
    });
    if (!hasCompletedOrder) {
      return res.status(403).json({ message: "You can only review dishes from completed orders" });
    }

    const existing = await Review.findOne({ dishId, customerId: req.user.id });
    if (existing) {
      return res.status(409).json({ message: "You already reviewed this dish. Use update instead." });
    }

    const review = await Review.create({
      dishId,
      customerId: req.user.id,
      customerName: `${req.user.firstName} ${req.user.lastName}`,
      rating,
      comment: comment?.trim() || "",
    });

    await refreshDishRating(dish._id);

    res.status(201).json({ message: "Review submitted", review });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: "You already reviewed this dish" });
    console.error("Create review error:", error);
    res.status(500).json({ message: "Server error" });
  }
}

// GET /api/reviews/dish/:dishId - Public: get reviews for a dish
export async function getDishReviews(req, res) {
  try {
    if (!isValidObjectId(req.params.dishId)) {
      return res.status(404).json({ message: "Dish not found" });
    }

    const reviews = await Review.find({ dishId: req.params.dishId })
      .sort({ createdAt: -1 })
      .lean();

    const dish = await Dish.findById(req.params.dishId).select("averageRating ratingCount").lean();
    if (!dish) return res.status(404).json({ message: "Dish not found" });

    res.json({
      reviews,
      averageRating: dish.averageRating || 0,
      ratingCount: dish.ratingCount || 0,
    });
  } catch (error) {
    console.error("Get dish reviews error:", error);
    res.status(500).json({ message: "Server error" });
  }
}

// GET /api/reviews/my - Customer: get my reviews
export async function getMyReviews(req, res) {
  try {
    const reviews = await Review.find({ customerId: req.user.id })
      .populate("dishId", "name imageUrl")
      .sort({ createdAt: -1 })
      .lean();
    res.json(reviews);
  } catch (error) {
    console.error("Get my reviews error:", error);
    res.status(500).json({ message: "Server error" });
  }
}

// PATCH /api/reviews/:id - Customer: update my review
export async function updateReview(req, res) {
  try {
    if (!isValidObjectId(req.params.id)) return res.status(404).json({ message: "Review not found" });

    const { comment } = req.body;
    const review = await Review.findById(req.params.id);

    if (!review) return res.status(404).json({ message: "Review not found" });
    if (review.customerId.toString() !== req.user.id) {
      return res.status(403).json({ message: "You can only update your own reviews" });
    }

    if (req.body.rating !== undefined) {
      const rating = parseRating(req.body.rating);
      if (Number.isNaN(rating) || rating < 1 || rating > 5) {
        return res.status(400).json({ message: "Rating must be an integer between 1 and 5" });
      }
      review.rating = rating;
    }
    if (comment !== undefined) {
      if (comment.length > 220) return res.status(400).json({ message: "Comment cannot exceed 220 characters" });
      review.comment = comment.trim();
    }

    await review.save();
    await refreshDishRating(review.dishId);

    res.json({ message: "Review updated", review });
  } catch (error) {
    console.error("Update review error:", error);
    res.status(500).json({ message: "Server error" });
  }
}

// DELETE /api/reviews/:id - Customer: delete my review
export async function deleteReview(req, res) {
  try {
    if (!isValidObjectId(req.params.id)) return res.status(404).json({ message: "Review not found" });

    const review = await Review.findById(req.params.id);
    if (!review) return res.status(404).json({ message: "Review not found" });
    if (review.customerId.toString() !== req.user.id) {
      return res.status(403).json({ message: "You can only delete your own reviews" });
    }

    const dishId = review.dishId;
    await review.deleteOne();
    await refreshDishRating(dishId);

    res.json({ message: "Review deleted" });
  } catch (error) {
    console.error("Delete review error:", error);
    res.status(500).json({ message: "Server error" });
  }
}

// GET /api/reviews/admin/all - Admin: list all reviews
export async function listAllReviews(req, res) {
  try {
    const reviews = await Review.find()
      .populate("dishId", "name imageUrl")
      .sort({ createdAt: -1 })
      .lean();
    res.json(reviews);
  } catch (error) {
    console.error("List all reviews error:", error);
    res.status(500).json({ message: "Server error" });
  }
}

// DELETE /api/reviews/admin/:id - Admin: delete any review
export async function adminDeleteReview(req, res) {
  try {
    if (!isValidObjectId(req.params.id)) return res.status(404).json({ message: "Review not found" });

    const review = await Review.findById(req.params.id);
    if (!review) return res.status(404).json({ message: "Review not found" });

    const dishId = review.dishId;
    await review.deleteOne();
    await refreshDishRating(dishId);

    res.json({ message: "Review deleted by admin" });
  } catch (error) {
    console.error("Admin delete review error:", error);
    res.status(500).json({ message: "Server error" });
  }
}

// PATCH /api/reviews/admin/:id/reply - Admin: post or edit a reply on a review
export async function adminReplyReview(req, res) {
  try {
    const { reply } = req.body;

    if (!reply || !reply.trim()) {
      return res.status(400).json({ message: "Reply is required" });
    }
    if (reply.length > 300) {
      return res.status(400).json({ message: "Reply cannot exceed 300 characters" });
    }
    if (!isValidObjectId(req.params.id)) {
      return res.status(404).json({ message: "Review not found" });
    }

    const review = await Review.findById(req.params.id);
    if (!review) return res.status(404).json({ message: "Review not found" });

    review.adminReply = reply.trim();
    review.adminReplyUpdatedAt = new Date();
    await review.save();

    res.json({ message: review.adminReply ? "Reply updated" : "Reply added", review });
  } catch (error) {
    console.error("Admin reply review error:", error);
    res.status(500).json({ message: "Server error" });
  }
}
