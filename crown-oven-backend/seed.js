// seed.js - Create default admin user and sample data
import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import User from "./models/User.js";
import Dish from "./models/Dish.js";
import DiningTable from "./models/DiningTable.js";
import Amenity from "./models/Amenity.js";

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected to MongoDB");

  const adminEmail = "admin@crownoven.com";
  const existingAdmin = await User.findOne({ email: adminEmail });

  if (existingAdmin) {
    console.log("Admin already exists");
  } else {
    await User.create({
      firstName: "Admin",
      lastName: "Crown",
      email: adminEmail,
      password: await bcrypt.hash("Admin@1234", 10),
      role: "admin",
      phone: "0771234567",
      address: "Crown Oven Restaurant, Colombo",
    });
    console.log("Admin created: admin@crownoven.com / Admin@1234");
  }

  const amenities = [
    { name: "Projector", price: 0, isChargeable: false, isActive: true },
    { name: "Sound System", price: 1000, isChargeable: true, isActive: true },
    { name: "Decorations", price: 1500, isChargeable: true, isActive: true },
    { name: "Whiteboard", price: 0, isChargeable: false, isActive: true },
    { name: "Wi-Fi", price: 0, isChargeable: false, isActive: true },
    { name: "Smart TV", price: 2000, isChargeable: true, isActive: true },
    { name: "Dance Floor", price: 5000, isChargeable: true, isActive: true },
    { name: "Party Lighting", price: 3500, isChargeable: true, isActive: true },
  ];

  for (const amenity of amenities) {
    const exists = await Amenity.findOne({ name: amenity.name });
    if (!exists) {
      await Amenity.create(amenity);
      console.log(`Amenity created: ${amenity.name}`);
    } else {
      console.log(`Amenity exists: ${amenity.name}`);
    }
  }

  const dishes = [
    { name: "Chicken Biryani", category: "Rice", description: "Aromatic basmati rice with tender chicken", price: 850, isAvailable: true },
    { name: "Vegetable Fried Rice", category: "Rice", description: "Stir-fried rice with fresh vegetables", price: 550, isAvailable: true },
    { name: "Grilled Chicken", category: "Mains", description: "Juicy grilled chicken with herbs", price: 950, isAvailable: true },
    { name: "Fish and Chips", category: "Mains", description: "Crispy battered fish with golden fries", price: 750, isAvailable: true },
    { name: "Caesar Salad", category: "Salads", description: "Fresh romaine with caesar dressing", price: 450, isAvailable: true },
    { name: "Mango Juice", category: "Beverages", description: "Fresh mango juice", price: 250, isAvailable: true },
    { name: "Chocolate Cake", category: "Desserts", description: "Rich dark chocolate layered cake", price: 400, isAvailable: true },
    { name: "Beef Burger", category: "Mains", description: "Premium beef patty with cheese", price: 700, isAvailable: true },
    { name: "Seafood Pasta", category: "Mains", description: "Creamy pasta with prawns and squid", price: 1100, isAvailable: true },
    { name: "Iced Coffee", category: "Beverages", description: "Cold brew coffee with ice", price: 350, isAvailable: true },
  ];

  for (const dish of dishes) {
    const exists = await Dish.findOne({ name: dish.name });
    if (!exists) {
      await Dish.create(dish);
      console.log(`Dish created: ${dish.name}`);
    } else {
      console.log(`Dish exists: ${dish.name}`);
    }
  }

  const tables = [
    { tableNo: "T1", seats: 2, location: "indoor" },
    { tableNo: "T2", seats: 2, location: "indoor" },
    { tableNo: "T3", seats: 4, location: "indoor" },
    { tableNo: "T4", seats: 4, location: "indoor" },
    { tableNo: "T5", seats: 2, location: "outdoor" },
    { tableNo: "T6", seats: 4, location: "outdoor" },
  ];

  for (const table of tables) {
    const exists = await DiningTable.findOne({ tableNo: table.tableNo });
    if (!exists) {
      await DiningTable.create(table);
      console.log(`Table created: ${table.tableNo}`);
    } else {
      console.log(`Table exists: ${table.tableNo}`);
    }
  }

  console.log("\nSeed complete!");
  console.log("Admin login: admin@crownoven.com / Admin@1234");
  await mongoose.disconnect();
}

seed().catch(console.error);
