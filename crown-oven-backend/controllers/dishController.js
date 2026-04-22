// controllers/dishController.js - Dish/catalog business logic
import mongoose from "mongoose";
import Dish, { DISH_CATEGORIES } from "../models/Dish.js";
import Review from "../models/Review.js";

function normalizePrice(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : NaN;
}

function validateCategory(category) {
  return DISH_CATEGORIES.includes(category?.trim());
}

function isValidDishId(id) {
  return /^[a-f\d]{24}$/i.test(id);
}

async function buildReviewStats(dishIds) {
  const validDishIds = dishIds
    .filter(Boolean)
    .map((dishId) => String(dishId));

  if (!validDishIds.length) return new Map();

  const stats = await Review.aggregate([
    {
      $match: {
        dishId: {
          $in: validDishIds.map((dishId) => new mongoose.Types.ObjectId(dishId)),
        },
      },
    },
    {
      $group: {
        _id: "$dishId",
        averageRating: { $avg: "$rating" },
        ratingCount: { $sum: 1 },
      },
    },
  ]);

  return new Map(
    stats.map((item) => [
      String(item._id),
      {
        averageRating: Math.round(item.averageRating * 10) / 10,
        ratingCount: item.ratingCount,
      },
    ])
  );
}

function mergeDishRatings(dishes, statsMap) {
  return dishes.map((dish) => {
    const stats = statsMap.get(String(dish._id));
    return {
      ...dish,
      averageRating: stats?.averageRating || 0,
      ratingCount: stats?.ratingCount || 0,
    };
  });
}

async function syncDishRatingCache(dishes, statsMap) {
  const updates = dishes
    .filter((dish) => {
      const stats = statsMap.get(String(dish._id));
      const averageRating = stats?.averageRating || 0;
      const ratingCount = stats?.ratingCount || 0;
      return dish.averageRating !== averageRating || dish.ratingCount !== ratingCount;
    })
    .map((dish) => {
      const stats = statsMap.get(String(dish._id));
      return Dish.updateOne(
        { _id: dish._id },
        {
          averageRating: stats?.averageRating || 0,
          ratingCount: stats?.ratingCount || 0,
        }
      );
    });

  if (updates.length) {
    await Promise.all(updates);
  }
}

export async function listPublicDishes(req, res) {
  try {
    const { category, search } = req.query;
    const filter = { isAvailable: true };

    if (category) filter.category = category;
    if (search) filter.name = { $regex: search, $options: "i" };

    const dishes = await Dish.find(filter).sort({ name: 1 }).lean();
    const statsMap = await buildReviewStats(dishes.map((dish) => dish._id));
    const hydratedDishes = mergeDishRatings(dishes, statsMap);
    await syncDishRatingCache(dishes, statsMap);

    res.json(hydratedDishes);
  } catch (error) {
    console.error("List public dishes error:", error);
    res.status(500).json({ message: "Server error" });
  }
}

export async function listAdminDishes(req, res) {
  try {
    const dishes = await Dish.find().sort({ name: 1 }).lean();
    const statsMap = await buildReviewStats(dishes.map((dish) => dish._id));
    const hydratedDishes = mergeDishRatings(dishes, statsMap);
    await syncDishRatingCache(dishes, statsMap);

    res.json(hydratedDishes);
  } catch (error) {
    console.error("List admin dishes error:", error);
    res.status(500).json({ message: "Server error" });
  }
}

export async function getDishById(req, res) {
  try {
    if (!isValidDishId(req.params.id)) return res.status(404).json({ message: "Dish not found" });

    const dish = await Dish.findById(req.params.id).lean();
    if (!dish || dish.isAvailable === false) return res.status(404).json({ message: "Dish not found" });

    const statsMap = await buildReviewStats([dish._id]);
    const hydratedDish = mergeDishRatings([dish], statsMap)[0];
    await syncDishRatingCache([dish], statsMap);

    res.json(hydratedDish);
  } catch (error) {
    console.error("Get dish error:", error);
    res.status(500).json({ message: "Server error" });
  }
}

export async function addDish(req, res) {
  try {
    const { name, category, description, price } = req.body;
    const normalizedPrice = normalizePrice(price);
    const trimmedCategory = category?.trim();

    if (!name || !category || price === undefined || price === null) {
      return res.status(400).json({ message: "Name, category, and price are required" });
    }
    if (!validateCategory(trimmedCategory)) {
      return res.status(400).json({ message: `Category must be one of: ${DISH_CATEGORIES.join(", ")}` });
    }
    if (Number.isNaN(normalizedPrice) || normalizedPrice <= 0) {
      return res.status(400).json({ message: "Price must be a valid number greater than 0" });
    }
    if (normalizedPrice > 99999) {
      return res.status(400).json({ message: "Price cannot exceed 99999" });
    }
    if (name.length > 100) {
      return res.status(400).json({ message: "Dish name cannot exceed 100 characters" });
    }
    if (trimmedCategory.length > 50) {
      return res.status(400).json({ message: "Category cannot exceed 50 characters" });
    }
    if (description && description.length > 500) {
      return res.status(400).json({ message: "Description cannot exceed 500 characters" });
    }

    const existing = await Dish.findOne({ name: name.trim() });
    if (existing) {
      return res.status(409).json({ message: "A dish with this name already exists" });
    }

    const dish = await Dish.create({
      name: name.trim(),
      category: trimmedCategory,
      description: description?.trim() || "",
      price: normalizedPrice,
      imageUrl: req.file?.path || "",
    });

    res.status(201).json({ message: "Dish added", dish });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: "Dish name already exists" });
    console.error("Add dish error:", error);
    res.status(500).json({ message: "Server error" });
  }
}

export async function updateDish(req, res) {
  try {
    if (!isValidDishId(req.params.id)) return res.status(404).json({ message: "Dish not found" });

    const { name, category, description, price, isAvailable, removeImage } = req.body;
    const updates = {};

    if (name) updates.name = name.trim();
    if (category) {
      const trimmedCategory = category.trim();
      if (!validateCategory(trimmedCategory)) {
        return res.status(400).json({ message: `Category must be one of: ${DISH_CATEGORIES.join(", ")}` });
      }
      updates.category = trimmedCategory;
    }
    if (description !== undefined) updates.description = description.trim();
    if (price !== undefined) {
      const normalizedPrice = normalizePrice(price);
      if (Number.isNaN(normalizedPrice) || normalizedPrice <= 0) {
        return res.status(400).json({ message: "Price must be a valid number greater than 0" });
      }
      if (normalizedPrice > 99999) {
        return res.status(400).json({ message: "Price cannot exceed 99999" });
      }
      updates.price = normalizedPrice;
    }
    if (name && name.length > 100) {
      return res.status(400).json({ message: "Dish name cannot exceed 100 characters" });
    }
    if (category && category.length > 50) {
      return res.status(400).json({ message: "Category cannot exceed 50 characters" });
    }
    if (description !== undefined && description.length > 500) {
      return res.status(400).json({ message: "Description cannot exceed 500 characters" });
    }
    if (isAvailable !== undefined) updates.isAvailable = isAvailable;
    if (String(removeImage).toLowerCase() === "true") updates.imageUrl = "";
    if (req.file) updates.imageUrl = req.file.path;

    const dish = await Dish.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
    if (!dish) return res.status(404).json({ message: "Dish not found" });

    res.json({ message: "Dish updated", dish });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: "Dish name already exists" });
    console.error("Update dish error:", error);
    res.status(500).json({ message: "Server error" });
  }
}

export async function deleteDish(req, res) {
  try {
    if (!isValidDishId(req.params.id)) return res.status(404).json({ message: "Dish not found" });

    const dish = await Dish.findByIdAndDelete(req.params.id);
    if (!dish) return res.status(404).json({ message: "Dish not found" });

    await Review.deleteMany({ dishId: req.params.id });

    res.json({ message: "Dish and related reviews deleted" });
  } catch (error) {
    console.error("Delete dish error:", error);
    res.status(500).json({ message: "Server error" });
  }
}
