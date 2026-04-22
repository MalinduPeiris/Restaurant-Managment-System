# Delivery Management Module — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a simple delivery management module so that when a delivery order reaches "Ready", a delivery record is auto-created. Admin assigns riders, riders update delivery status, and customers see delivery progress.

**Architecture:** New Delivery model + controller + routes on backend. "rider" role added to User model. Auto-trigger on order status change creates deliveries. Frontend gets a new RiderTabs navigator, admin gets 2 new drawer screens (Deliveries, Riders), and customer's OrderDetailScreen shows delivery info.

**Tech Stack:** Node.js/Express (ES modules), MongoDB/Mongoose, React Native (Expo 52), React Navigation 7

---

## Task 1: Add "rider" role to User model

**Files:**
- Modify: `crown-oven-backend/models/User.js:29-32`

**Step 1: Update the role enum**

In `crown-oven-backend/models/User.js`, change line 31 from:
```javascript
enum: ["customer", "admin"],
```
to:
```javascript
enum: ["customer", "admin", "rider"],
```

**Step 2: Commit**
```bash
git add crown-oven-backend/models/User.js
git commit -m "feat: add rider role to User model"
```

---

## Task 2: Create requireRider middleware

**Files:**
- Create: `crown-oven-backend/middleware/requireRider.js`

**Step 1: Create the middleware**

```javascript
export default function requireRider(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ message: "Authentication required" });
  }
  if (req.user.role !== "rider") {
    return res.status(403).json({ message: "Rider access required" });
  }
  next();
}
```

**Step 2: Commit**
```bash
git add crown-oven-backend/middleware/requireRider.js
git commit -m "feat: add requireRider middleware"
```

---

## Task 3: Create Delivery model

**Files:**
- Create: `crown-oven-backend/models/Delivery.js`

**Step 1: Create the model**

```javascript
import mongoose from "mongoose";

const deliverySchema = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      unique: true,
    },
    riderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    status: {
      type: String,
      enum: ["PENDING", "ASSIGNED", "ON_THE_WAY", "DELIVERED"],
      default: "PENDING",
    },
    deliveryAddress: {
      type: String,
      required: true,
    },
    customerName: {
      type: String,
      required: true,
    },
    customerPhone: {
      type: String,
      default: "",
    },
    assignedAt: { type: Date, default: null },
    pickedUpAt: { type: Date, default: null },
    deliveredAt: { type: Date, default: null },
  },
  { timestamps: true }
);

deliverySchema.index({ riderId: 1, status: 1 });
deliverySchema.index({ status: 1, createdAt: -1 });

const Delivery = mongoose.model("Delivery", deliverySchema);
export default Delivery;
```

**Step 2: Commit**
```bash
git add crown-oven-backend/models/Delivery.js
git commit -m "feat: add Delivery model"
```

---

## Task 4: Add auto-create delivery trigger in orderController

**Files:**
- Modify: `crown-oven-backend/controllers/orderController.js`

**Step 1: Add Delivery import at top (after line 2)**

```javascript
import Delivery from "../models/Delivery.js";
```

**Step 2: Add auto-trigger after `order.status = status; await order.save();` in updateOrderStatus (around line 186)**

Replace the existing success response block:
```javascript
    order.status = status;
    await order.save();

    res.json({ message: `Order status updated to ${status}`, order });
```

With:
```javascript
    order.status = status;
    await order.save();

    // Auto-create delivery when a delivery order reaches "Ready"
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
```

**Step 3: Commit**
```bash
git add crown-oven-backend/controllers/orderController.js
git commit -m "feat: auto-create delivery when order reaches Ready"
```

---

## Task 5: Create delivery controller

**Files:**
- Create: `crown-oven-backend/controllers/deliveryController.js`

**Step 1: Create the controller with all 5 endpoints**

```javascript
// controllers/deliveryController.js — Delivery management logic
import Delivery from "../models/Delivery.js";
import Order from "../models/Order.js";
import User from "../models/User.js";

// Valid status transitions (backend-enforced)
const DELIVERY_TRANSITIONS = {
  PENDING: ["ASSIGNED"],
  ASSIGNED: ["ON_THE_WAY"],
  ON_THE_WAY: ["DELIVERED"],
};

// GET /api/deliveries/admin/all — Admin: list all deliveries
export async function listAllDeliveries(req, res) {
  try {
    const { status } = req.query;
    const filter = {};
    if (status) filter.status = status;

    const deliveries = await Delivery.find(filter)
      .populate("orderId", "orderNumber totalAmount orderType status")
      .populate("riderId", "firstName lastName phone")
      .sort({ createdAt: -1 })
      .lean();

    res.json(deliveries);
  } catch (error) {
    console.error("List deliveries error:", error);
    res.status(500).json({ message: "Server error" });
  }
}

// PATCH /api/deliveries/admin/:id/assign — Admin: assign rider
export async function assignRider(req, res) {
  try {
    const { riderId } = req.body;

    if (!riderId) {
      return res.status(400).json({ message: "riderId is required" });
    }

    // Verify rider exists and has rider role
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

    res.json({ message: "Rider assigned successfully", delivery: populated });
  } catch (error) {
    console.error("Assign rider error:", error);
    res.status(500).json({ message: "Server error" });
  }
}

// GET /api/deliveries/rider/my — Rider: get my deliveries
export async function getMyDeliveries(req, res) {
  try {
    const deliveries = await Delivery.find({ riderId: req.user.id })
      .populate("orderId", "orderNumber totalAmount orderType items status")
      .sort({ createdAt: -1 })
      .lean();

    res.json(deliveries);
  } catch (error) {
    console.error("Get my deliveries error:", error);
    res.status(500).json({ message: "Server error" });
  }
}

// PATCH /api/deliveries/rider/:id/status — Rider: update delivery status
export async function updateDeliveryStatus(req, res) {
  try {
    const { status } = req.body;

    if (!["ON_THE_WAY", "DELIVERED"].includes(status)) {
      return res.status(400).json({ message: "Rider can only set status to ON_THE_WAY or DELIVERED" });
    }

    const delivery = await Delivery.findById(req.params.id);
    if (!delivery) return res.status(404).json({ message: "Delivery not found" });

    // Rider can only update their own deliveries
    if (delivery.riderId?.toString() !== req.user.id) {
      return res.status(403).json({ message: "This delivery is not assigned to you" });
    }

    // Enforce status transitions
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

      // Auto-update order status to "Delivered"
      await Order.findByIdAndUpdate(delivery.orderId, { status: "Delivered" });
    }

    await delivery.save();

    const populated = await Delivery.findById(delivery._id)
      .populate("orderId", "orderNumber totalAmount orderType status")
      .populate("riderId", "firstName lastName phone")
      .lean();

    res.json({ message: `Delivery status updated to ${status}`, delivery: populated });
  } catch (error) {
    console.error("Update delivery status error:", error);
    res.status(500).json({ message: "Server error" });
  }
}

// GET /api/deliveries/order/:orderId — Customer: get delivery for their order
export async function getDeliveryByOrder(req, res) {
  try {
    // Verify the order belongs to this customer (or user is admin)
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

    res.json(delivery);
  } catch (error) {
    console.error("Get delivery by order error:", error);
    res.status(500).json({ message: "Server error" });
  }
}
```

**Step 2: Commit**
```bash
git add crown-oven-backend/controllers/deliveryController.js
git commit -m "feat: add delivery controller with all endpoints"
```

---

## Task 6: Add admin create-rider endpoint to authController

**Files:**
- Modify: `crown-oven-backend/controllers/authController.js`

**Step 1: Add createRider function at the end of the file (before the closing)**

Add after the `deleteUser` function:

```javascript
// POST /api/auth/admin/create-rider — Admin: create a rider account
export async function createRider(req, res) {
  try {
    const { firstName, lastName, email, password, phone } = req.body;

    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({ message: "First name, last name, email, and password are required" });
    }
    if (!isValidEmail(email)) {
      return res.status(400).json({ message: "Invalid email format" });
    }
    if (!isStrongPassword(password)) {
      return res.status(400).json({
        message: "Password must be at least 8 characters with uppercase, lowercase, number, and special character",
      });
    }
    if (phone && !isValidPhone(phone)) {
      return res.status(400).json({ message: "Phone must be exactly 10 digits" });
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
```

**Step 2: Commit**
```bash
git add crown-oven-backend/controllers/authController.js
git commit -m "feat: add admin create-rider endpoint"
```

---

## Task 7: Create delivery routes

**Files:**
- Create: `crown-oven-backend/routes/deliveryRoutes.js`

**Step 1: Create the routes file**

```javascript
import { Router } from "express";
import requireAuth from "../middleware/requireAuth.js";
import requireAdmin from "../middleware/requireAdmin.js";
import requireRider from "../middleware/requireRider.js";
import {
  listAllDeliveries,
  assignRider,
  getMyDeliveries,
  updateDeliveryStatus,
  getDeliveryByOrder,
} from "../controllers/deliveryController.js";

const router = Router();

// Admin routes
router.get("/admin/all", requireAuth, requireAdmin, listAllDeliveries);
router.patch("/admin/:id/assign", requireAuth, requireAdmin, assignRider);

// Rider routes
router.get("/rider/my", requireAuth, requireRider, getMyDeliveries);
router.patch("/rider/:id/status", requireAuth, requireRider, updateDeliveryStatus);

// Customer route (any authenticated user can check their order's delivery)
router.get("/order/:orderId", requireAuth, getDeliveryByOrder);

export default router;
```

**Step 2: Commit**
```bash
git add crown-oven-backend/routes/deliveryRoutes.js
git commit -m "feat: add delivery routes"
```

---

## Task 8: Add rider list endpoint and mount delivery routes

**Files:**
- Modify: `crown-oven-backend/routes/authRoutes.js`
- Modify: `crown-oven-backend/app.js`

**Step 1: Add create-rider and list-riders routes to authRoutes.js**

Add these imports to authRoutes.js (the createRider import) and routes:

After the existing admin routes (`/admin/users` DELETE), add:
```javascript
router.post("/admin/create-rider", requireAuth, requireAdmin, createRider);
router.get("/admin/riders", requireAuth, requireAdmin, listRiders);
```

And add `createRider` and `listRiders` to the imports from `../controllers/authController.js`.

For `listRiders`, add this function to `authController.js`:
```javascript
// GET /api/auth/admin/riders — Admin: list all riders
export async function listRiders(req, res) {
  try {
    const riders = await User.find({ role: "rider" }).select("-password").sort({ createdAt: -1 });
    res.json(riders);
  } catch (error) {
    console.error("List riders error:", error);
    res.status(500).json({ message: "Server error" });
  }
}
```

**Step 2: Mount delivery routes in app.js**

Add import at top of `app.js`:
```javascript
import deliveryRoutes from "./routes/deliveryRoutes.js";
```

Add route mounting after the reservations line:
```javascript
app.use("/api/deliveries", deliveryRoutes);
```

**Step 3: Commit**
```bash
git add crown-oven-backend/app.js crown-oven-backend/routes/authRoutes.js crown-oven-backend/controllers/authController.js
git commit -m "feat: mount delivery routes, add rider list endpoint"
```

---

## Task 9: Update login to handle rider role

**Files:**
- Modify: `crown-oven-backend/controllers/authController.js`

**Step 1: No changes needed**

The existing `login()` function already works for all roles — it checks email/password, returns token with role included. The `buildTokenPayload()` includes `role`, so the frontend can detect `rider` role. No backend changes needed.

**Step 2: Prevent riders from self-registering**

In the `register()` function, add after validation (around line 52, before `const hashedPassword`):

```javascript
    // Prevent self-registration as rider or admin
    if (req.body.role && req.body.role !== "customer") {
      return res.status(400).json({ message: "Only customer registration is allowed" });
    }
```

**Step 3: Commit**
```bash
git add crown-oven-backend/controllers/authController.js
git commit -m "feat: prevent rider self-registration"
```

---

## Task 10: Create frontend delivery service

**Files:**
- Create: `crown-oven-frontend/src/services/deliveryService.js`

**Step 1: Create the service**

```javascript
import API from "../constants/api";

// Admin
export const listAllDeliveries = (params) => API.get("/deliveries/admin/all", { params });
export const assignRider = (id, riderId) => API.patch(`/deliveries/admin/${id}/assign`, { riderId });

// Rider
export const getMyDeliveries = () => API.get("/deliveries/rider/my");
export const updateDeliveryStatus = (id, status) => API.patch(`/deliveries/rider/${id}/status`, { status });

// Customer
export const getDeliveryByOrder = (orderId) => API.get(`/deliveries/order/${orderId}`);

// Rider management (admin)
export const createRider = (data) => API.post("/auth/admin/create-rider", data);
export const listRiders = () => API.get("/auth/admin/riders");
```

**Step 2: Commit**
```bash
git add crown-oven-frontend/src/services/deliveryService.js
git commit -m "feat: add delivery service for frontend API calls"
```

---

## Task 11: Create RiderDeliveriesScreen

**Files:**
- Create: `crown-oven-frontend/src/screens/deliveries/RiderDeliveriesScreen.js`

**Step 1: Create the screen**

```javascript
import { useState, useCallback } from "react";
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, ScrollView, Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import COLORS from "../../constants/colors";
import { FONTS, SIZES } from "../../constants/fonts";
import { getMyDeliveries, updateDeliveryStatus } from "../../services/deliveryService";
import Card from "../../components/common/Card";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import EmptyState from "../../components/common/EmptyState";

const GRADIENT = ["#DAA520", "#F0A830", "#FA9141"];

const STATUS_COLORS = {
  PENDING: COLORS.gray,
  ASSIGNED: "#E8732A",
  ON_THE_WAY: "#DAA520",
  DELIVERED: "#2E7D32",
};

const STATUS_LABELS = {
  PENDING: "Pending",
  ASSIGNED: "Assigned",
  ON_THE_WAY: "On the Way",
  DELIVERED: "Delivered",
};

const FILTERS = ["All", "ASSIGNED", "ON_THE_WAY", "DELIVERED"];
const FILTER_LABELS = { All: "All", ASSIGNED: "Assigned", ON_THE_WAY: "On the Way", DELIVERED: "Delivered" };

export default function RiderDeliveriesScreen() {
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState("All");

  const fetchDeliveries = useCallback(async () => {
    try {
      const res = await getMyDeliveries();
      let list = res.data || [];
      if (activeFilter !== "All") {
        list = list.filter((d) => d.status === activeFilter);
      }
      setDeliveries(list);
    } catch (err) {
      console.error("Failed to fetch deliveries:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeFilter]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchDeliveries();
    }, [fetchDeliveries])
  );

  const onRefresh = () => { setRefreshing(true); fetchDeliveries(); };

  const handleStatusUpdate = (delivery, newStatus) => {
    const label = newStatus === "ON_THE_WAY" ? "On the Way" : "Delivered";
    Alert.alert("Update Status", `Mark this delivery as "${label}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Confirm",
        onPress: async () => {
          try {
            await updateDeliveryStatus(delivery._id, newStatus);
            fetchDeliveries();
          } catch (err) {
            Alert.alert("Error", err.response?.data?.message || "Update failed.");
          }
        },
      },
    ]);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString("en-ZA", {
      day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
    });
  };

  const renderDelivery = ({ item }) => {
    const badgeColor = STATUS_COLORS[item.status] || COLORS.gray;
    const order = item.orderId;

    return (
      <Card style={styles.card}>
        <View style={styles.topRow}>
          <Text style={styles.orderNumber}>#{order?.orderNumber || "N/A"}</Text>
          <View style={[styles.statusBadge, { backgroundColor: badgeColor + "1A" }]}>
            <Text style={[styles.statusText, { color: badgeColor }]}>
              {STATUS_LABELS[item.status]}
            </Text>
          </View>
        </View>

        <View style={styles.infoRow}>
          <Ionicons name="person" size={16} color={COLORS.gray} />
          <Text style={styles.infoText}>{item.customerName}</Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="location" size={16} color={COLORS.gray} />
          <Text style={styles.infoText}>{item.deliveryAddress}</Text>
        </View>
        {item.customerPhone ? (
          <View style={styles.infoRow}>
            <Ionicons name="call" size={16} color={COLORS.gray} />
            <Text style={styles.infoText}>{item.customerPhone}</Text>
          </View>
        ) : null}

        <View style={styles.bottomRow}>
          <Text style={styles.totalText}>
            Rs. {order?.totalAmount?.toFixed(2) || "0.00"}
          </Text>
          <Text style={styles.dateText}>{formatDate(item.createdAt)}</Text>
        </View>

        {/* Action buttons */}
        {item.status === "ASSIGNED" && (
          <TouchableOpacity onPress={() => handleStatusUpdate(item, "ON_THE_WAY")} activeOpacity={0.7}>
            <LinearGradient colors={GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.actionBtn}>
              <Ionicons name="bicycle" size={18} color="#fff" style={{ marginRight: 6 }} />
              <Text style={styles.actionBtnText}>Pick Up & Start Delivery</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}
        {item.status === "ON_THE_WAY" && (
          <TouchableOpacity onPress={() => handleStatusUpdate(item, "DELIVERED")} activeOpacity={0.7}>
            <LinearGradient colors={["#2E7D32", "#43A047"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.actionBtn}>
              <Ionicons name="checkmark-circle" size={18} color="#fff" style={{ marginRight: 6 }} />
              <Text style={styles.actionBtnText}>Mark as Delivered</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}
      </Card>
    );
  };

  if (loading) return <LoadingSpinner />;

  return (
    <SafeAreaView style={styles.safe}>
      <Text style={styles.pageTitle}>My Deliveries</Text>

      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {FILTERS.map((f) => (
            <TouchableOpacity
              key={f}
              style={[styles.filterChip, activeFilter === f && styles.filterActive]}
              onPress={() => setActiveFilter(f)}
            >
              <Text style={[styles.filterText, activeFilter === f && styles.filterTextActive]}>
                {FILTER_LABELS[f]}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={deliveries}
        keyExtractor={(item) => item._id}
        renderItem={renderDelivery}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} colors={[COLORS.primary]} />}
        ListEmptyComponent={<EmptyState message="No deliveries found." />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  pageTitle: {
    fontFamily: FONTS.title, fontSize: SIZES.title, color: COLORS.black,
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8,
  },
  filterContainer: { paddingLeft: 20, marginBottom: 8 },
  filterScroll: { gap: 8, paddingRight: 20 },
  filterChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.lightGray,
  },
  filterActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filterText: { fontFamily: FONTS.medium, fontSize: SIZES.caption, color: COLORS.charcoal },
  filterTextActive: { color: COLORS.black },
  listContent: { paddingHorizontal: 20, paddingBottom: 24 },

  card: { padding: 16 },
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  orderNumber: { fontFamily: FONTS.heading, fontSize: SIZES.h2, color: COLORS.black },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 14 },
  statusText: { fontFamily: FONTS.heading, fontSize: SIZES.caption },

  infoRow: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  infoText: { fontFamily: FONTS.body, fontSize: SIZES.body, color: COLORS.charcoal, marginLeft: 8, flex: 1 },

  bottomRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 8 },
  totalText: { fontFamily: FONTS.heading, fontSize: SIZES.h2, color: COLORS.primary },
  dateText: { fontFamily: FONTS.body, fontSize: SIZES.caption, color: COLORS.gray },

  actionBtn: {
    marginTop: 12, borderRadius: 10, paddingVertical: 12,
    flexDirection: "row", justifyContent: "center", alignItems: "center",
  },
  actionBtnText: { fontFamily: FONTS.heading, fontSize: SIZES.body, color: "#fff" },
});
```

**Step 2: Commit**
```bash
git add crown-oven-frontend/src/screens/deliveries/RiderDeliveriesScreen.js
git commit -m "feat: add RiderDeliveriesScreen"
```

---

## Task 12: Create ManageDeliveriesScreen (admin)

**Files:**
- Create: `crown-oven-frontend/src/screens/deliveries/ManageDeliveriesScreen.js`

**Step 1: Create the screen**

```javascript
import { useState, useCallback } from "react";
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, ScrollView, Alert, Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import COLORS from "../../constants/colors";
import { FONTS, SIZES } from "../../constants/fonts";
import { listAllDeliveries, assignRider, listRiders } from "../../services/deliveryService";
import Card from "../../components/common/Card";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import EmptyState from "../../components/common/EmptyState";

const GRADIENT = ["#DAA520", "#F0A830", "#FA9141"];

const STATUS_COLORS = {
  PENDING: COLORS.gray,
  ASSIGNED: "#E8732A",
  ON_THE_WAY: "#DAA520",
  DELIVERED: "#2E7D32",
};

const STATUS_LABELS = {
  PENDING: "Pending",
  ASSIGNED: "Assigned",
  ON_THE_WAY: "On the Way",
  DELIVERED: "Delivered",
};

const FILTERS = ["All", "PENDING", "ASSIGNED", "ON_THE_WAY", "DELIVERED"];
const FILTER_LABELS = { All: "All", PENDING: "Pending", ASSIGNED: "Assigned", ON_THE_WAY: "On the Way", DELIVERED: "Delivered" };

export default function ManageDeliveriesScreen({ navigation }) {
  const [deliveries, setDeliveries] = useState([]);
  const [riders, setRiders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState("All");

  // Rider picker modal
  const [showRiderModal, setShowRiderModal] = useState(false);
  const [selectedDelivery, setSelectedDelivery] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const params = activeFilter !== "All" ? { status: activeFilter } : {};
      const [delRes, riderRes] = await Promise.all([
        listAllDeliveries(params),
        listRiders(),
      ]);
      setDeliveries(delRes.data || []);
      setRiders(riderRes.data || []);
    } catch (err) {
      console.error("Failed to fetch data:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeFilter]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchData();
    }, [fetchData])
  );

  const onRefresh = () => { setRefreshing(true); fetchData(); };

  const openRiderPicker = (delivery) => {
    setSelectedDelivery(delivery);
    setShowRiderModal(true);
  };

  const handleAssignRider = async (riderId) => {
    setShowRiderModal(false);
    try {
      await assignRider(selectedDelivery._id, riderId);
      Alert.alert("Success", "Rider assigned successfully");
      fetchData();
    } catch (err) {
      Alert.alert("Error", err.response?.data?.message || "Failed to assign rider.");
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString("en-ZA", {
      day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
    });
  };

  const renderDelivery = ({ item }) => {
    const badgeColor = STATUS_COLORS[item.status] || COLORS.gray;
    const order = item.orderId;
    const rider = item.riderId;

    return (
      <Card style={styles.card}>
        <View style={styles.topRow}>
          <Text style={styles.orderNumber}>#{order?.orderNumber || "N/A"}</Text>
          <View style={[styles.statusBadge, { backgroundColor: badgeColor + "1A" }]}>
            <Text style={[styles.statusText, { color: badgeColor }]}>
              {STATUS_LABELS[item.status]}
            </Text>
          </View>
        </View>

        <View style={styles.infoRow}>
          <Ionicons name="person" size={16} color={COLORS.gray} />
          <Text style={styles.infoText}>{item.customerName}</Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="location" size={16} color={COLORS.gray} />
          <Text style={styles.infoText}>{item.deliveryAddress}</Text>
        </View>

        {rider && (
          <View style={styles.riderRow}>
            <Ionicons name="bicycle" size={16} color={COLORS.primary} />
            <Text style={styles.riderText}>
              {rider.firstName} {rider.lastName} {rider.phone ? `(${rider.phone})` : ""}
            </Text>
          </View>
        )}

        <View style={styles.bottomRow}>
          <Text style={styles.totalText}>Rs. {order?.totalAmount?.toFixed(2) || "0.00"}</Text>
          <Text style={styles.dateText}>{formatDate(item.createdAt)}</Text>
        </View>

        {item.status === "PENDING" && (
          <TouchableOpacity onPress={() => openRiderPicker(item)} activeOpacity={0.7}>
            <LinearGradient colors={GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.assignBtn}>
              <Ionicons name="person-add" size={18} color="#fff" style={{ marginRight: 6 }} />
              <Text style={styles.assignBtnText}>Assign Rider</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}
      </Card>
    );
  };

  if (loading) return <LoadingSpinner />;

  return (
    <SafeAreaView style={styles.safe}>
      <Text style={styles.pageTitle}>Manage Deliveries</Text>

      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {FILTERS.map((f) => (
            <TouchableOpacity
              key={f}
              style={[styles.filterChip, activeFilter === f && styles.filterActive]}
              onPress={() => setActiveFilter(f)}
            >
              <Text style={[styles.filterText, activeFilter === f && styles.filterTextActive]}>
                {FILTER_LABELS[f]}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={deliveries}
        keyExtractor={(item) => item._id}
        renderItem={renderDelivery}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} colors={[COLORS.primary]} />}
        ListEmptyComponent={<EmptyState message="No deliveries found." />}
      />

      {/* Rider Picker Modal */}
      <Modal visible={showRiderModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Rider</Text>
              <TouchableOpacity onPress={() => setShowRiderModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.charcoal} />
              </TouchableOpacity>
            </View>

            {riders.length === 0 ? (
              <Text style={styles.noRiders}>No riders available. Create a rider first.</Text>
            ) : (
              <FlatList
                data={riders.filter((r) => !r.isBlocked)}
                keyExtractor={(item) => item._id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.riderOption}
                    onPress={() => handleAssignRider(item._id)}
                  >
                    <Ionicons name="bicycle" size={20} color={COLORS.primary} />
                    <View style={{ marginLeft: 12, flex: 1 }}>
                      <Text style={styles.riderName}>{item.firstName} {item.lastName}</Text>
                      <Text style={styles.riderEmail}>{item.email}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={COLORS.gray} />
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  pageTitle: {
    fontFamily: FONTS.title, fontSize: SIZES.title, color: COLORS.black,
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8,
  },
  filterContainer: { paddingLeft: 20, marginBottom: 8 },
  filterScroll: { gap: 8, paddingRight: 20 },
  filterChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.lightGray,
  },
  filterActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filterText: { fontFamily: FONTS.medium, fontSize: SIZES.caption, color: COLORS.charcoal },
  filterTextActive: { color: COLORS.black },
  listContent: { paddingHorizontal: 20, paddingBottom: 24 },

  card: { padding: 16 },
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  orderNumber: { fontFamily: FONTS.heading, fontSize: SIZES.h2, color: COLORS.black },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 14 },
  statusText: { fontFamily: FONTS.heading, fontSize: SIZES.caption },

  infoRow: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  infoText: { fontFamily: FONTS.body, fontSize: SIZES.body, color: COLORS.charcoal, marginLeft: 8, flex: 1 },

  riderRow: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#DAA520" + "15", padding: 8, borderRadius: 8, marginTop: 4, marginBottom: 4,
  },
  riderText: { fontFamily: FONTS.medium, fontSize: SIZES.body, color: COLORS.charcoal, marginLeft: 8 },

  bottomRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 8 },
  totalText: { fontFamily: FONTS.heading, fontSize: SIZES.h2, color: COLORS.primary },
  dateText: { fontFamily: FONTS.body, fontSize: SIZES.caption, color: COLORS.gray },

  assignBtn: {
    marginTop: 12, borderRadius: 10, paddingVertical: 12,
    flexDirection: "row", justifyContent: "center", alignItems: "center",
  },
  assignBtnText: { fontFamily: FONTS.heading, fontSize: SIZES.body, color: "#fff" },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalContent: {
    backgroundColor: COLORS.white, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    maxHeight: "60%", paddingBottom: 30,
  },
  modalHeader: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    padding: 20, borderBottomWidth: 1, borderBottomColor: COLORS.lightGray,
  },
  modalTitle: { fontFamily: FONTS.heading, fontSize: SIZES.h1, color: COLORS.black },
  noRiders: { fontFamily: FONTS.body, fontSize: SIZES.body, color: COLORS.gray, padding: 20, textAlign: "center" },
  riderOption: {
    flexDirection: "row", alignItems: "center",
    padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.lightGray,
  },
  riderName: { fontFamily: FONTS.medium, fontSize: SIZES.body, color: COLORS.black },
  riderEmail: { fontFamily: FONTS.body, fontSize: SIZES.caption, color: COLORS.gray },
});
```

**Step 2: Commit**
```bash
git add crown-oven-frontend/src/screens/deliveries/ManageDeliveriesScreen.js
git commit -m "feat: add ManageDeliveriesScreen for admin"
```

---

## Task 13: Create ManageRidersScreen (admin)

**Files:**
- Create: `crown-oven-frontend/src/screens/deliveries/ManageRidersScreen.js`

**Step 1: Create the screen**

```javascript
import { useState, useCallback } from "react";
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, Alert, Modal, TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import COLORS from "../../constants/colors";
import { FONTS, SIZES } from "../../constants/fonts";
import { createRider, listRiders } from "../../services/deliveryService";
import { updateUser } from "../../services/authService";
import Card from "../../components/common/Card";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import EmptyState from "../../components/common/EmptyState";

const GRADIENT = ["#DAA520", "#F0A830", "#FA9141"];

export default function ManageRidersScreen() {
  const [riders, setRiders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [creating, setCreating] = useState(false);

  // Form state
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", password: "", phone: "" });

  const fetchRiders = useCallback(async () => {
    try {
      const res = await listRiders();
      setRiders(res.data || []);
    } catch (err) {
      console.error("Failed to fetch riders:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchRiders();
    }, [fetchRiders])
  );

  const onRefresh = () => { setRefreshing(true); fetchRiders(); };

  const resetForm = () => setForm({ firstName: "", lastName: "", email: "", password: "", phone: "" });

  const handleCreateRider = async () => {
    if (!form.firstName || !form.lastName || !form.email || !form.password) {
      Alert.alert("Error", "First name, last name, email, and password are required.");
      return;
    }
    setCreating(true);
    try {
      await createRider(form);
      Alert.alert("Success", "Rider account created.");
      setShowModal(false);
      resetForm();
      fetchRiders();
    } catch (err) {
      Alert.alert("Error", err.response?.data?.message || "Failed to create rider.");
    } finally {
      setCreating(false);
    }
  };

  const handleToggleBlock = (rider) => {
    const action = rider.isBlocked ? "unblock" : "block";
    Alert.alert(
      `${action.charAt(0).toUpperCase() + action.slice(1)} Rider`,
      `Are you sure you want to ${action} ${rider.firstName} ${rider.lastName}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Yes",
          onPress: async () => {
            try {
              await updateUser(rider._id, { isBlocked: !rider.isBlocked });
              fetchRiders();
            } catch (err) {
              Alert.alert("Error", err.response?.data?.message || "Update failed.");
            }
          },
        },
      ]
    );
  };

  const renderRider = ({ item }) => (
    <Card style={styles.card}>
      <View style={styles.topRow}>
        <View style={styles.riderInfo}>
          <Ionicons name="bicycle" size={22} color={COLORS.primary} />
          <View style={{ marginLeft: 12 }}>
            <Text style={styles.riderName}>{item.firstName} {item.lastName}</Text>
            <Text style={styles.riderEmail}>{item.email}</Text>
            {item.phone ? <Text style={styles.riderPhone}>{item.phone}</Text> : null}
          </View>
        </View>
        <View style={[styles.statusDot, { backgroundColor: item.isBlocked ? COLORS.error : COLORS.success }]} />
      </View>

      <TouchableOpacity
        style={[styles.blockBtn, { borderColor: item.isBlocked ? COLORS.success : COLORS.error }]}
        onPress={() => handleToggleBlock(item)}
      >
        <Text style={[styles.blockBtnText, { color: item.isBlocked ? COLORS.success : COLORS.error }]}>
          {item.isBlocked ? "Unblock" : "Block"}
        </Text>
      </TouchableOpacity>
    </Card>
  );

  if (loading) return <LoadingSpinner />;

  return (
    <SafeAreaView style={styles.safe}>
      <Text style={styles.pageTitle}>Manage Riders</Text>

      <FlatList
        data={riders}
        keyExtractor={(item) => item._id}
        renderItem={renderRider}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} colors={[COLORS.primary]} />}
        ListEmptyComponent={<EmptyState message="No riders yet. Create one!" />}
      />

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={() => setShowModal(true)} activeOpacity={0.8}>
        <LinearGradient colors={GRADIENT} style={styles.fabGradient}>
          <Ionicons name="add" size={28} color="#fff" />
        </LinearGradient>
      </TouchableOpacity>

      {/* Create Rider Modal */}
      <Modal visible={showModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create Rider</Text>
              <TouchableOpacity onPress={() => { setShowModal(false); resetForm(); }}>
                <Ionicons name="close" size={24} color={COLORS.charcoal} />
              </TouchableOpacity>
            </View>

            <View style={styles.formContainer}>
              <TextInput style={styles.input} placeholder="First Name" value={form.firstName} onChangeText={(v) => setForm({ ...form, firstName: v })} />
              <TextInput style={styles.input} placeholder="Last Name" value={form.lastName} onChangeText={(v) => setForm({ ...form, lastName: v })} />
              <TextInput style={styles.input} placeholder="Email" value={form.email} onChangeText={(v) => setForm({ ...form, email: v })} keyboardType="email-address" autoCapitalize="none" />
              <TextInput style={styles.input} placeholder="Password" value={form.password} onChangeText={(v) => setForm({ ...form, password: v })} secureTextEntry />
              <TextInput style={styles.input} placeholder="Phone (10 digits)" value={form.phone} onChangeText={(v) => setForm({ ...form, phone: v })} keyboardType="phone-pad" />

              <TouchableOpacity onPress={handleCreateRider} disabled={creating} activeOpacity={0.7}>
                <LinearGradient colors={GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.createBtn, creating && { opacity: 0.6 }]}>
                  <Text style={styles.createBtnText}>{creating ? "Creating..." : "Create Rider"}</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  pageTitle: {
    fontFamily: FONTS.title, fontSize: SIZES.title, color: COLORS.black,
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8,
  },
  listContent: { paddingHorizontal: 20, paddingBottom: 100 },

  card: { padding: 16 },
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  riderInfo: { flexDirection: "row", alignItems: "center", flex: 1 },
  riderName: { fontFamily: FONTS.heading, fontSize: SIZES.body, color: COLORS.black },
  riderEmail: { fontFamily: FONTS.body, fontSize: SIZES.caption, color: COLORS.gray },
  riderPhone: { fontFamily: FONTS.body, fontSize: SIZES.caption, color: COLORS.charcoal },
  statusDot: { width: 12, height: 12, borderRadius: 6 },

  blockBtn: {
    marginTop: 12, paddingVertical: 8, borderRadius: 8,
    borderWidth: 1, alignItems: "center",
  },
  blockBtnText: { fontFamily: FONTS.heading, fontSize: SIZES.caption },

  fab: { position: "absolute", bottom: 24, right: 24 },
  fabGradient: { width: 56, height: 56, borderRadius: 28, justifyContent: "center", alignItems: "center", elevation: 4 },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalContent: {
    backgroundColor: COLORS.white, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingBottom: 30,
  },
  modalHeader: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    padding: 20, borderBottomWidth: 1, borderBottomColor: COLORS.lightGray,
  },
  modalTitle: { fontFamily: FONTS.heading, fontSize: SIZES.h1, color: COLORS.black },

  formContainer: { padding: 20 },
  input: {
    height: 48, borderWidth: 1, borderColor: COLORS.lightGray, borderRadius: 12,
    paddingHorizontal: 14, fontFamily: FONTS.body, fontSize: SIZES.body,
    marginBottom: 12, backgroundColor: COLORS.white,
  },
  createBtn: { borderRadius: 10, paddingVertical: 14, alignItems: "center", marginTop: 4 },
  createBtnText: { fontFamily: FONTS.heading, fontSize: SIZES.button, color: "#fff" },
});
```

**Step 2: Commit**
```bash
git add crown-oven-frontend/src/screens/deliveries/ManageRidersScreen.js
git commit -m "feat: add ManageRidersScreen for admin"
```

---

## Task 14: Create RiderTabs navigator

**Files:**
- Create: `crown-oven-frontend/src/navigation/RiderTabs.js`

**Step 1: Create the navigator**

```javascript
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import COLORS from "../constants/colors";
import { FONTS } from "../constants/fonts";
import RiderDeliveriesScreen from "../screens/deliveries/RiderDeliveriesScreen";
import ProfileScreen from "../screens/auth/ProfileScreen";

const Tab = createBottomTabNavigator();

export default function RiderTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#DAA520",
        tabBarInactiveTintColor: COLORS.gray,
        tabBarStyle: {
          backgroundColor: COLORS.white,
          borderTopColor: COLORS.lightGray,
          height: 62,
          paddingBottom: 8,
          paddingTop: 4,
        },
        tabBarLabelStyle: { fontFamily: FONTS.medium, fontSize: 11 },
      }}
    >
      <Tab.Screen
        name="RiderDeliveries"
        component={RiderDeliveriesScreen}
        options={{
          tabBarLabel: "Deliveries",
          tabBarIcon: ({ color, size }) => <Ionicons name="bicycle" size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="RiderProfile"
        component={ProfileScreen}
        options={{
          tabBarLabel: "Profile",
          tabBarIcon: ({ color, size }) => <Ionicons name="person" size={size} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}
```

**Step 2: Commit**
```bash
git add crown-oven-frontend/src/navigation/RiderTabs.js
git commit -m "feat: add RiderTabs navigator"
```

---

## Task 15: Update AppNavigator to handle rider role

**Files:**
- Modify: `crown-oven-frontend/src/navigation/AppNavigator.js`

**Step 1: Add RiderTabs import after AdminDrawer (line 8)**

```javascript
import RiderTabs from "./RiderTabs";
```

**Step 2: Add rider navigation block between admin and customer blocks**

After the admin block closing `</>` (line 39) and before the customer `<>` block, add:

```javascript
        ) : user.role === "rider" ? (
          <>
            <Stack.Screen name="RiderHome" component={RiderTabs} />
          </>
```

The full conditional becomes:
```javascript
        {!user ? (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
          </>
        ) : user.role === "admin" ? (
          <>
            <Stack.Screen name="AdminHome" component={AdminDrawer} />
            <Stack.Screen name="DishDetail" component={DishDetailScreen} />
            <Stack.Screen name="OrderDetail" component={OrderDetailScreen} />
          </>
        ) : user.role === "rider" ? (
          <>
            <Stack.Screen name="RiderHome" component={RiderTabs} />
          </>
        ) : (
          <>
            <Stack.Screen name="CustomerHome" component={CustomerTabs} />
            ...existing customer screens...
          </>
        )}
```

**Step 3: Commit**
```bash
git add crown-oven-frontend/src/navigation/AppNavigator.js
git commit -m "feat: add rider navigation to AppNavigator"
```

---

## Task 16: Add Deliveries and Riders to AdminDrawer

**Files:**
- Modify: `crown-oven-frontend/src/navigation/AdminDrawer.js`

**Step 1: Add imports for the new screens (after line 10)**

```javascript
import ManageDeliveriesScreen from "../screens/deliveries/ManageDeliveriesScreen";
import ManageRidersScreen from "../screens/deliveries/ManageRidersScreen";
```

**Step 2: Add drawer screens after ManageReservations (line 46) and before ManageUsers**

```javascript
      <Drawer.Screen name="ManageDeliveries" component={ManageDeliveriesScreen}
        options={{ title: "Deliveries", drawerIcon: ({ color, size }) => <Ionicons name="bicycle" size={size} color={color} /> }}
      />
      <Drawer.Screen name="ManageRiders" component={ManageRidersScreen}
        options={{ title: "Riders", drawerIcon: ({ color, size }) => <Ionicons name="people-circle" size={size} color={color} /> }}
      />
```

**Step 3: Commit**
```bash
git add crown-oven-frontend/src/navigation/AdminDrawer.js
git commit -m "feat: add Deliveries and Riders to admin drawer"
```

---

## Task 17: Update OrderDetailScreen to show delivery info (customer)

**Files:**
- Modify: `crown-oven-frontend/src/screens/orders/OrderDetailScreen.js`

**Step 1: Add delivery service import (after line 28)**

```javascript
import { getDeliveryByOrder } from "../../services/deliveryService";
```

**Step 2: Add delivery state (after line 47)**

```javascript
  const [delivery, setDelivery] = useState(null);
```

**Step 3: Add delivery fetch inside the fetchOrder function (after setOrder line)**

After `setOrder(res.data?.order || res.data);` add:

```javascript
      // Fetch delivery info if it's a delivery order
      const orderData = res.data?.order || res.data;
      setOrder(orderData);
      if (orderData.orderType === "delivery" && ["Ready", "Delivered"].includes(orderData.status)) {
        try {
          const delRes = await getDeliveryByOrder(orderId);
          setDelivery(delRes.data);
        } catch {
          setDelivery(null);
        }
      }
```

And remove the duplicate `setOrder` line that was there before.

**Step 4: Add delivery status card in the JSX (after the delivery address Card, around line 213)**

After the delivery address Card closing tag, add:

```javascript
        {/* ── Delivery Tracking ──────────────────────────────── */}
        {delivery && (
          <Card style={{ marginTop: 8 }}>
            <Text style={styles.detailTitle}>Delivery Status</Text>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Status</Text>
              <View style={[styles.deliveryBadge, { backgroundColor: DELIVERY_COLORS[delivery.status] + "1A" }]}>
                <Text style={[styles.deliveryBadgeText, { color: DELIVERY_COLORS[delivery.status] }]}>
                  {DELIVERY_LABELS[delivery.status]}
                </Text>
              </View>
            </View>
            {delivery.riderId && (
              <>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Rider</Text>
                  <Text style={styles.detailValue}>
                    {delivery.riderId.firstName} {delivery.riderId.lastName}
                  </Text>
                </View>
                {delivery.riderId.phone && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Rider Phone</Text>
                    <Text style={styles.detailValue}>{delivery.riderId.phone}</Text>
                  </View>
                )}
              </>
            )}
          </Card>
        )}
```

**Step 5: Add the delivery color/label constants (after STATUS_COLORS around line 40)**

```javascript
const DELIVERY_COLORS = {
  PENDING: "#999",
  ASSIGNED: "#E8732A",
  ON_THE_WAY: "#DAA520",
  DELIVERED: "#2E7D32",
};

const DELIVERY_LABELS = {
  PENDING: "Awaiting Rider",
  ASSIGNED: "Rider Assigned",
  ON_THE_WAY: "On the Way",
  DELIVERED: "Delivered",
};
```

**Step 6: Add delivery badge styles (at end of StyleSheet)**

```javascript
  deliveryBadge: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10,
  },
  deliveryBadgeText: {
    fontFamily: FONTS.heading, fontSize: SIZES.caption,
  },
```

**Step 7: Commit**
```bash
git add crown-oven-frontend/src/screens/orders/OrderDetailScreen.js
git commit -m "feat: show delivery tracking info on OrderDetailScreen"
```

---

## Task 18: Seed a test rider (optional)

**Files:**
- Modify: `crown-oven-backend/seed.js` (if it exists) or create manually via API

**Step 1: After implementation, use the admin panel to create a test rider**

- Login as admin
- Go to Riders drawer item
- Tap "+" FAB
- Create: `Rider One`, `rider@crownoven.com`, `Rider@123`, `0712345678`

**Step 2: Test the full flow**

1. Customer places a delivery order
2. Admin moves order: Pending → Preparing → Ready
3. Delivery auto-created (check admin Deliveries screen)
4. Admin assigns the rider
5. Rider logs in, sees assigned delivery
6. Rider taps "Pick Up & Start Delivery" (ON_THE_WAY)
7. Rider taps "Mark as Delivered" (DELIVERED)
8. Customer checks OrderDetail — sees "Delivered" + rider info
9. Order status auto-updated to "Delivered"

---

## Summary of All Files

### Backend (create/modify)
| Action | File |
|--------|------|
| Modify | `models/User.js` — add "rider" to enum |
| Create | `middleware/requireRider.js` |
| Create | `models/Delivery.js` |
| Modify | `controllers/orderController.js` — auto-create delivery trigger |
| Create | `controllers/deliveryController.js` — 5 endpoints |
| Modify | `controllers/authController.js` — createRider + listRiders + prevent rider self-reg |
| Create | `routes/deliveryRoutes.js` |
| Modify | `routes/authRoutes.js` — add rider routes |
| Modify | `app.js` — mount delivery routes |

### Frontend (create/modify)
| Action | File |
|--------|------|
| Create | `services/deliveryService.js` |
| Create | `screens/deliveries/RiderDeliveriesScreen.js` |
| Create | `screens/deliveries/ManageDeliveriesScreen.js` |
| Create | `screens/deliveries/ManageRidersScreen.js` |
| Create | `navigation/RiderTabs.js` |
| Modify | `navigation/AppNavigator.js` — rider role routing |
| Modify | `navigation/AdminDrawer.js` — add Deliveries + Riders |
| Modify | `screens/orders/OrderDetailScreen.js` — delivery tracking card |
