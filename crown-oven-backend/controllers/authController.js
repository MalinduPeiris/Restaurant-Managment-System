// controllers/authController.js - Authentication and user management logic
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import User from "../models/User.js";
import Delivery from "../models/Delivery.js";

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isStrongPassword(password) {
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/.test(password);
}

function isValidPhone(phone) {
  return /^\d{10}$/.test(phone);
}

function isValidName(name) {
  return /^[A-Za-z\s''-]+$/.test(name.trim());
}

function isValidNIC(nic) {
  return /^\d{9}[VvXx]$/.test(nic) || /^\d{12}$/.test(nic);
}

function isValidVehicleNumber(num) {
  return /^[A-Za-z]{2,3}[-\s]?\d{4}$/.test(num);
}

function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

function buildTokenPayload(user) {
  return {
    id: user._id,
    email: user.email,
    role: user.role,
    firstName: user.firstName,
    lastName: user.lastName,
    isBlocked: user.isBlocked,
  };
}

export async function register(req, res) {
  try {
    const { firstName, lastName, email, password, phone, address } = req.body;

    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({ message: "First name, last name, email, and password are required" });
    }
    if (!isValidEmail(email)) {
      return res.status(400).json({ message: "Invalid email format" });
    }
    if (!isValidName(firstName) || !isValidName(lastName)) {
      return res.status(400).json({ message: "First name and last name can contain letters only" });
    }
    if (!isStrongPassword(password)) {
      return res.status(400).json({
        message: "Password must be at least 8 characters with uppercase, lowercase, number, and special character",
      });
    }
    if (phone && !isValidPhone(phone)) {
      return res.status(400).json({ message: "Phone must be exactly 10 digits" });
    }

    if (req.body.role && req.body.role !== "customer") {
      return res.status(400).json({ message: "Only customer registration is allowed" });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({ message: "Email already registered" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      phone: phone || "",
      address: address || "",
    });

    const payload = buildTokenPayload(user);
    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || "7d",
    });

    res.status(201).json({ message: "Registration successful", token, user: payload });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: "Email already registered" });
    }
    console.error("Register error:", error);
    res.status(500).json({ message: "Server error during registration" });
  }
}

export async function login(req, res) {
  try {
    const { email, password, expectedRole } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    if (user.isBlocked) {
      return res.status(403).json({ message: "Your account has been blocked. Contact admin." });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    if (expectedRole && user.role !== expectedRole) {
      const portalName = user.role.charAt(0).toUpperCase() + user.role.slice(1);
      return res.status(403).json({
        message: `This is a ${portalName} account. Please use the ${portalName} Login.`,
      });
    }

    const payload = buildTokenPayload(user);
    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || "7d",
    });

    res.json({ message: "Login successful", token, user: payload });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Server error during login" });
  }
}

export async function getProfile(req, res) {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({ message: "Server error" });
  }
}

export async function updateProfile(req, res) {
  try {
    const { firstName, lastName, phone, address } = req.body;
    const updates = {};

    if (req.body.role || req.body.email || req.body.password || req.body.isBlocked !== undefined) {
      return res.status(400).json({ message: "Cannot update role, email, password, or block status via this endpoint" });
    }

    if (firstName) {
      if (!isValidName(firstName)) {
        return res.status(400).json({ message: "First name can contain letters only" });
      }
      updates.firstName = firstName.trim();
    }
    if (lastName) {
      if (!isValidName(lastName)) {
        return res.status(400).json({ message: "Last name can contain letters only" });
      }
      updates.lastName = lastName.trim();
    }
    if (address !== undefined) updates.address = address.trim();
    if (phone !== undefined) {
      if (phone && !isValidPhone(phone)) {
        return res.status(400).json({ message: "Phone must be exactly 10 digits" });
      }
      updates.phone = phone;
    }

    const user = await User.findByIdAndUpdate(req.user.id, updates, { new: true, runValidators: true }).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });

    res.json({ message: "Profile updated", user });
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({ message: "Server error" });
  }
}

export async function changePassword(req, res) {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Current and new password are required" });
    }
    if (!isStrongPassword(newPassword)) {
      return res.status(400).json({
        message: "New password must be at least 8 characters with uppercase, lowercase, number, and special character",
      });
    }

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) return res.status(401).json({ message: "Current password is incorrect" });

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.json({ message: "Password changed successfully" });
  } catch (error) {
    console.error("Change password error:", error);
    res.status(500).json({ message: "Server error" });
  }
}

export async function uploadAvatar(req, res) {
  try {
    if (!req.file) return res.status(400).json({ message: "No image file provided" });

    const user = await User.findByIdAndUpdate(req.user.id, { image: req.file.path }, { new: true }).select("-password");
    res.json({ message: "Avatar uploaded", user });
  } catch (error) {
    console.error("Upload avatar error:", error);
    res.status(500).json({ message: "Server error" });
  }
}

export async function listUsers(req, res) {
  try {
    const users = await User.find().select("-password").sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    console.error("List users error:", error);
    res.status(500).json({ message: "Server error" });
  }
}

export async function updateUser(req, res) {
  try {
    const { isBlocked, firstName, lastName, phone, email, nic, vehicleType, vehicleNumber, address, emergencyContact } = req.body;

    if (req.params.id === req.user.id) {
      return res.status(400).json({ message: "You cannot modify your own account" });
    }
    if (!isValidObjectId(req.params.id)) {
      return res.status(404).json({ message: "User not found" });
    }

    const updateFields = {};
    if (typeof isBlocked === "boolean") updateFields.isBlocked = isBlocked;
    if (firstName) {
      if (!isValidName(firstName)) {
        return res.status(400).json({ message: "First name can contain letters only" });
      }
      updateFields.firstName = firstName.trim();
    }
    if (lastName) {
      if (!isValidName(lastName)) {
        return res.status(400).json({ message: "Last name can contain letters only" });
      }
      updateFields.lastName = lastName.trim();
    }
    if (phone !== undefined) {
      if (phone && !isValidPhone(phone)) {
        return res.status(400).json({ message: "Phone must be exactly 10 digits" });
      }
      updateFields.phone = phone;
    }
    if (email) {
      if (!isValidEmail(email)) {
        return res.status(400).json({ message: "Invalid email format" });
      }
      const existing = await User.findOne({ email: email.toLowerCase(), _id: { $ne: req.params.id } });
      if (existing) {
        return res.status(409).json({ message: "Email already registered" });
      }
      updateFields.email = email.toLowerCase().trim();
    }
    if (nic !== undefined) {
      if (nic && !isValidNIC(nic)) {
        return res.status(400).json({ message: "Invalid NIC. Use old format (9 digits + V/X) or new format (12 digits)" });
      }
      updateFields.nic = nic.trim();
    }
    if (vehicleType !== undefined) {
      if (vehicleType && !["motorcycle", "three-wheeler"].includes(vehicleType)) {
        return res.status(400).json({ message: "Vehicle type must be motorcycle or three-wheeler" });
      }
      updateFields.vehicleType = vehicleType;
    }
    if (vehicleNumber !== undefined) {
      if (vehicleNumber && !isValidVehicleNumber(vehicleNumber)) {
        return res.status(400).json({ message: "Invalid vehicle number format (e.g. ABC-1234)" });
      }
      updateFields.vehicleNumber = vehicleNumber.trim();
    }
    if (address !== undefined) updateFields.address = address.trim();
    if (emergencyContact !== undefined) {
      if (emergencyContact && !isValidPhone(emergencyContact)) {
        return res.status(400).json({ message: "Emergency contact must be exactly 10 digits" });
      }
      updateFields.emergencyContact = emergencyContact;
    }

    const user = await User.findByIdAndUpdate(req.params.id, updateFields, { new: true }).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });

    res.json({ message: "User updated", user });
  } catch (error) {
    console.error("Update user error:", error);
    res.status(500).json({ message: "Server error" });
  }
}

export async function deleteUser(req, res) {
  try {
    if (req.params.id === req.user.id) {
      return res.status(400).json({ message: "You cannot delete your own account" });
    }
    if (!isValidObjectId(req.params.id)) {
      return res.status(404).json({ message: "User not found" });
    }

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.role === "rider") {
      await Delivery.updateMany(
        { riderId: user._id, status: { $in: ["ASSIGNED", "ON_THE_WAY"] } },
        { riderId: null, status: "PENDING", assignedAt: null, pickedUpAt: null }
      );
    }

    await User.findByIdAndDelete(req.params.id);

    res.json({ message: "User deleted" });
  } catch (error) {
    console.error("Delete user error:", error);
    res.status(500).json({ message: "Server error" });
  }
}

export async function createRider(req, res) {
  try {
    const { firstName, lastName, email, password, phone, nic, vehicleType, vehicleNumber, address, emergencyContact } = req.body;

    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({ message: "First name, last name, email, and password are required" });
    }
    if (!isValidEmail(email)) {
      return res.status(400).json({ message: "Invalid email format" });
    }
    if (!isValidName(firstName) || !isValidName(lastName)) {
      return res.status(400).json({ message: "First name and last name can contain letters only" });
    }
    if (!isStrongPassword(password)) {
      return res.status(400).json({
        message: "Password must be at least 8 characters with uppercase, lowercase, number, and special character",
      });
    }
    if (phone && !isValidPhone(phone)) {
      return res.status(400).json({ message: "Phone must be exactly 10 digits" });
    }
    if (nic && !isValidNIC(nic)) {
      return res.status(400).json({ message: "Invalid NIC. Use old format (9 digits + V/X) or new format (12 digits)" });
    }
    if (vehicleType && !["motorcycle", "three-wheeler"].includes(vehicleType)) {
      return res.status(400).json({ message: "Vehicle type must be motorcycle or three-wheeler" });
    }
    if (vehicleNumber && !isValidVehicleNumber(vehicleNumber)) {
      return res.status(400).json({ message: "Invalid vehicle number format (e.g. ABC-1234)" });
    }
    if (vehicleType && !vehicleNumber) {
      return res.status(400).json({ message: "Vehicle number is required when vehicle type is selected" });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({ message: "Email already registered" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const rider = await User.create({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      role: "rider",
      phone: phone || "",
      nic: nic || "",
      vehicleType: vehicleType || undefined,
      vehicleNumber: vehicleNumber || "",
      address: address || "",
      emergencyContact: emergencyContact || "",
    });

    res.status(201).json({
      message: "Rider account created",
      rider: {
        id: rider._id,
        firstName: rider.firstName,
        lastName: rider.lastName,
        email: rider.email,
        role: rider.role,
        phone: rider.phone,
        nic: rider.nic,
        vehicleType: rider.vehicleType,
        vehicleNumber: rider.vehicleNumber,
        address: rider.address,
        emergencyContact: rider.emergencyContact,
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: "Email already registered" });
    }
    console.error("Create rider error:", error);
    res.status(500).json({ message: "Server error" });
  }
}

export async function listRiders(req, res) {
  try {
    const riders = await User.find({ role: "rider" }).select("-password").sort({ createdAt: -1 });
    res.json(riders);
  } catch (error) {
    console.error("List riders error:", error);
    res.status(500).json({ message: "Server error" });
  }
}

