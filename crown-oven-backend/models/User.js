// models/User.js — User schema for authentication and profiles
import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: [true, "First name is required"],
      trim: true,
      maxlength: 30,
    },
    lastName: {
      type: String,
      required: [true, "Last name is required"],
      trim: true,
      maxlength: 30,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, "Password is required"],
    },
    role: {
      type: String,
      enum: ["customer", "admin", "rider"],
      default: "customer",
    },
    phone: {
      type: String,
      trim: true,
    },
    address: {
      type: String,
      trim: true,
    },
    image: {
      type: String,
    },
    isBlocked: {
      type: Boolean,
      default: false,
    },
    // Rider-specific fields
    nic: {
      type: String,
      trim: true,
    },
    vehicleType: {
      type: String,
      enum: ["motorcycle", "three-wheeler"],
    },
    vehicleNumber: {
      type: String,
      trim: true,
      uppercase: true,
    },
    emergencyContact: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

// email index already created by unique: true
userSchema.index({ role: 1 });

const User = mongoose.model("User", userSchema);
export default User;
