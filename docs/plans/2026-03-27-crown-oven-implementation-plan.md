# Crown Oven Mobile App — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a full-stack React Native mobile app for restaurant management with 6 modules assigned to 6 team members.

**Architecture:** Expo React Native frontend communicating via Axios to a Node.js/Express REST API. MongoDB Atlas for data, Cloudinary for image uploads, JWT for authentication. Two roles: customer and admin.

**Tech Stack:** React Native (Expo), Node.js, Express.js, MongoDB/Mongoose, JWT, bcrypt, Cloudinary, multer, Axios, React Navigation

---

## Phase 0: Project Setup (Team Lead — before anyone starts)

### Task 0.1: Initialize Backend Project

**Files:**
- Create: `crown-oven-backend/package.json`
- Create: `crown-oven-backend/server.js`
- Create: `crown-oven-backend/app.js`
- Create: `crown-oven-backend/.env`
- Create: `crown-oven-backend/.gitignore`

**Step 1: Create project folder and init**

```bash
mkdir crown-oven-backend
cd crown-oven-backend
npm init -y
```

**Step 2: Install dependencies**

```bash
npm install express mongoose bcrypt jsonwebtoken cors dotenv cloudinary multer multer-storage-cloudinary express-rate-limit
npm install -D nodemon
```

**Step 3: Update package.json**

```json
{
  "name": "crown-oven-backend",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "start": "nodemon server.js",
    "prod": "node server.js"
  }
}
```

**Step 4: Create .env**

```env
PORT=3000
MONGODB_URI=mongodb://CrownOvenAdmin:CrownOven1939@ac-fiszbpm-shard-00-00.ujwhtnc.mongodb.net:27017,ac-fiszbpm-shard-00-01.ujwhtnc.mongodb.net:27017,ac-fiszbpm-shard-00-02.ujwhtnc.mongodb.net:27017/Crown_Oven?ssl=true&replicaSet=atlas-imghql-shard-0&authSource=admin&appName=Cluster0
JWT_SECRET=crown-oven-secret-key-2026
JWT_EXPIRES_IN=7d
CLOUDINARY_CLOUD_NAME=dktvsifyf
CLOUDINARY_API_KEY=226688966766758
CLOUDINARY_API_SECRET=DbSbLthnsVfhLJLjyIVsb9JpBFY
CORS_ORIGIN=*
```

**Step 5: Create .gitignore**

```
node_modules/
.env
```

**Step 6: Commit**

```bash
git init
git add .
git commit -m "chore: init backend project with dependencies"
```

---

### Task 0.2: Create Backend Config Files

**Files:**
- Create: `crown-oven-backend/config/db.js`
- Create: `crown-oven-backend/config/cloudinary.js`

**Step 1: Create config/db.js — MongoDB connection**

```js
// config/db.js — MongoDB Atlas connection
import mongoose from "mongoose";

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("MongoDB connected successfully");
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    process.exit(1);
  }
};

export default connectDB;
```

**Step 2: Create config/cloudinary.js — Cloudinary setup**

```js
// config/cloudinary.js — Image upload configuration
import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import multer from "multer";

// Configure Cloudinary with env credentials
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Storage for dish images
const dishStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "crown-oven/dishes",
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
    transformation: [{ width: 500, height: 500, crop: "limit" }],
  },
});

// Storage for payment proof images
const proofStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "crown-oven/payment-proofs",
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
  },
});

// Storage for user avatar images
const avatarStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "crown-oven/avatars",
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
    transformation: [{ width: 200, height: 200, crop: "fill" }],
  },
});

export const uploadDishImage = multer({ storage: dishStorage });
export const uploadProofImage = multer({ storage: proofStorage });
export const uploadAvatar = multer({ storage: avatarStorage });
export default cloudinary;
```

**Step 3: Commit**

```bash
git add config/
git commit -m "feat: add MongoDB and Cloudinary config"
```

---

### Task 0.3: Create Middleware Files

**Files:**
- Create: `crown-oven-backend/middleware/auth.js`
- Create: `crown-oven-backend/middleware/requireAuth.js`
- Create: `crown-oven-backend/middleware/requireAdmin.js`

**Step 1: Create middleware/auth.js — JWT token decoder**

```js
// middleware/auth.js — Decodes JWT token and attaches user to request
import jwt from "jsonwebtoken";

export default function authenticateUser(req, res, next) {
  const header = req.header("Authorization");

  // No token = continue as guest (some routes are public)
  if (!header) return next();

  const token = header.replace("Bearer ", "");

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { id, email, role }
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid token, please login again" });
  }
}
```

**Step 2: Create middleware/requireAuth.js — Block unauthenticated users**

```js
// middleware/requireAuth.js — Ensures user is logged in and not blocked
export default function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ message: "Authentication required" });
  }
  if (req.user.isBlocked) {
    return res.status(403).json({ message: "Your account has been blocked" });
  }
  next();
}
```

**Step 3: Create middleware/requireAdmin.js — Block non-admin users**

```js
// middleware/requireAdmin.js — Ensures user has admin role
export default function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ message: "Authentication required" });
  }
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Admin access required" });
  }
  next();
}
```

**Step 4: Commit**

```bash
git add middleware/
git commit -m "feat: add auth, requireAuth, requireAdmin middleware"
```

---

### Task 0.4: Create app.js and server.js

**Files:**
- Create: `crown-oven-backend/app.js`
- Create: `crown-oven-backend/server.js`
- Create: `crown-oven-backend/utils/helpers.js`

**Step 1: Create utils/helpers.js — Shared utility functions**

```js
// utils/helpers.js — Shared helper functions used across controllers

// Generate unique order number: ORD-1711234567890
export function generateOrderNumber() {
  return `ORD-${Date.now()}`;
}

// Generate unique payment ID: PAY-1711234567890
export function generatePaymentId() {
  return `PAY-${Date.now()}`;
}
```

**Step 2: Create app.js — Express app setup (routes mounted here)**

```js
// app.js — Express application setup
import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import authenticateUser from "./middleware/auth.js";

// Import routes (each member creates their own)
import authRoutes from "./routes/authRoutes.js";
import dishRoutes from "./routes/dishRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import tableRoutes from "./routes/tableRoutes.js";
import reviewRoutes from "./routes/reviewRoutes.js";

const app = express();

// Parse JSON bodies
app.use(express.json({ limit: "15mb" }));

// Enable CORS for mobile app
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

// Rate limit on auth endpoints (20 attempts per 15 min)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { message: "Too many attempts. Try again after 15 minutes." },
});
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);

// Decode JWT on every request (does not block guests)
app.use(authenticateUser);

// Mount all routes under /api prefix
app.use("/api/auth", authRoutes);
app.use("/api/dishes", dishRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/tables", tableRoutes);
app.use("/api/reviews", reviewRoutes);

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "Crown Oven API is running" });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: "Internal server error" });
});

export default app;
```

**Step 3: Create server.js — Entry point**

```js
// server.js — Application entry point
import "dotenv/config";
import app from "./app.js";
import connectDB from "./config/db.js";

const PORT = process.env.PORT || 3000;

// Connect to MongoDB then start server
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Crown Oven API running on port ${PORT}`);
  });
});
```

**Step 4: Create placeholder route files (so app.js imports don't fail)**

Each member will fill these in. For now, create empty routers:

```js
// routes/authRoutes.js (placeholder — Member 1 fills this)
import { Router } from "express";
const router = Router();
export default router;
```

Create same placeholder for: `dishRoutes.js`, `orderRoutes.js`, `paymentRoutes.js`, `tableRoutes.js`, `reviewRoutes.js`

**Step 5: Test server starts**

```bash
npm start
```
Expected: `Crown Oven API running on port 3000` + `MongoDB connected successfully`

**Step 6: Commit**

```bash
git add .
git commit -m "feat: add app.js, server.js, helpers, placeholder routes"
```

---

### Task 0.5: Initialize React Native Frontend (Expo)

**Step 1: Create Expo project**

```bash
npx create-expo-app crown-oven-frontend --template blank
cd crown-oven-frontend
```

**Step 2: Install dependencies**

```bash
npx expo install @react-navigation/native @react-navigation/bottom-tabs @react-navigation/drawer @react-navigation/native-stack react-native-screens react-native-safe-area-context react-native-gesture-handler react-native-reanimated
npm install axios @react-native-async-storage/async-storage expo-image-picker
npx expo install expo-font @expo-google-fonts/poppins @expo-google-fonts/playfair-display
```

**Step 3: Commit**

```bash
git add .
git commit -m "chore: init Expo React Native project with dependencies"
```

---

### Task 0.6: Create Frontend Theme Constants

**Files:**
- Create: `crown-oven-frontend/src/constants/colors.js`
- Create: `crown-oven-frontend/src/constants/fonts.js`
- Create: `crown-oven-frontend/src/constants/api.js`

**Step 1: Create src/constants/colors.js**

```js
// constants/colors.js — Crown Oven brand color palette
const COLORS = {
  primary: "#D4A843",     // Royal Gold — buttons, highlights
  black: "#1A1A1A",       // Crown Black — headers, text
  accent: "#E8732A",      // Flame Orange — badges, warnings
  charcoal: "#2D2D2D",    // Dark secondary text
  background: "#FAF8F5",  // Ivory White — screen backgrounds
  white: "#FFFFFF",       // Cards, inputs
  gray: "#9E9E9E",        // Placeholders, disabled
  lightGray: "#F0F0F0",   // Dividers, borders
  success: "#2E7D32",     // Available, verified, served
  error: "#C62828",       // Cancelled, rejected, errors
};

export default COLORS;
```

**Step 2: Create src/constants/fonts.js**

```js
// constants/fonts.js — Typography configuration
export const FONTS = {
  title: "PlayfairDisplay_700Bold",
  heading: "Poppins_600SemiBold",
  medium: "Poppins_500Medium",
  body: "Poppins_400Regular",
  bold: "Poppins_700Bold",
};

export const SIZES = {
  title: 28,
  h1: 22,
  h2: 18,
  body: 14,
  button: 16,
  caption: 12,
};
```

**Step 3: Create src/constants/api.js — Axios instance with JWT interceptor**

```js
// constants/api.js — Configured Axios instance for all API calls
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Change this to your deployed URL before submission
const API = axios.create({
  baseURL: "http://10.0.2.2:3000/api", // Android emulator → localhost
  // baseURL: "http://localhost:3000/api", // iOS simulator
  // baseURL: "https://your-deployed-url.com/api", // Production
  timeout: 10000,
});

// Automatically attach JWT token to every request
API.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 errors globally (token expired)
API.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await AsyncStorage.removeItem("token");
      await AsyncStorage.removeItem("user");
      // Navigation to login is handled by AuthContext
    }
    return Promise.reject(error);
  }
);

export default API;
```

**Step 4: Commit**

```bash
git add src/constants/
git commit -m "feat: add theme colors, fonts, and API config"
```

---

### Task 0.7: Create AuthContext (Shared Auth State)

**Files:**
- Create: `crown-oven-frontend/src/context/AuthContext.js`

**Step 1: Create AuthContext**

```js
// context/AuthContext.js — Global authentication state
import { createContext, useState, useEffect, useContext } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import API from "../constants/api";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);       // Current user object
  const [token, setToken] = useState(null);      // JWT token
  const [loading, setLoading] = useState(true);  // Loading state on app start

  // On app start, check if user is already logged in
  useEffect(() => {
    loadStoredAuth();
  }, []);

  const loadStoredAuth = async () => {
    try {
      const storedToken = await AsyncStorage.getItem("token");
      const storedUser = await AsyncStorage.getItem("user");
      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      }
    } catch (error) {
      console.error("Failed to load auth:", error);
    } finally {
      setLoading(false);
    }
  };

  // Call after successful login
  const login = async (tokenValue, userData) => {
    await AsyncStorage.setItem("token", tokenValue);
    await AsyncStorage.setItem("user", JSON.stringify(userData));
    setToken(tokenValue);
    setUser(userData);
  };

  // Call to log out
  const logout = async () => {
    await AsyncStorage.removeItem("token");
    await AsyncStorage.removeItem("user");
    setToken(null);
    setUser(null);
  };

  // Update stored user data (after profile edit)
  const updateUser = async (userData) => {
    await AsyncStorage.setItem("user", JSON.stringify(userData));
    setUser(userData);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook — use this in any screen
export const useAuth = () => useContext(AuthContext);

export default AuthContext;
```

**Step 2: Commit**

```bash
git add src/context/
git commit -m "feat: add AuthContext for global auth state"
```

---

### Task 0.8: Create Common UI Components

**Files:**
- Create: `crown-oven-frontend/src/components/common/Button.js`
- Create: `crown-oven-frontend/src/components/common/Input.js`
- Create: `crown-oven-frontend/src/components/common/Card.js`
- Create: `crown-oven-frontend/src/components/common/LoadingSpinner.js`
- Create: `crown-oven-frontend/src/components/common/Header.js`
- Create: `crown-oven-frontend/src/components/common/EmptyState.js`

**Step 1: Create Button.js**

```jsx
// components/common/Button.js — Reusable button with Crown Oven styling
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from "react-native";
import COLORS from "../../constants/colors";
import { FONTS, SIZES } from "../../constants/fonts";

export default function Button({ title, onPress, variant = "primary", loading = false, disabled = false, style }) {
  const isPrimary = variant === "primary";
  const isDanger = variant === "danger";

  return (
    <TouchableOpacity
      style={[
        styles.button,
        isPrimary && styles.primary,
        variant === "secondary" && styles.secondary,
        isDanger && styles.danger,
        (disabled || loading) && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator color={isPrimary ? COLORS.black : COLORS.white} />
      ) : (
        <Text style={[
          styles.text,
          isPrimary && styles.primaryText,
          variant === "secondary" && styles.secondaryText,
          isDanger && styles.dangerText,
        ]}>
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 50,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  primary: { backgroundColor: COLORS.primary },
  secondary: { backgroundColor: "transparent", borderWidth: 1.5, borderColor: COLORS.black },
  danger: { backgroundColor: COLORS.error },
  disabled: { opacity: 0.5 },
  text: { fontFamily: FONTS.heading, fontSize: SIZES.button },
  primaryText: { color: COLORS.black },
  secondaryText: { color: COLORS.black },
  dangerText: { color: COLORS.white },
});
```

**Step 2: Create Input.js**

```jsx
// components/common/Input.js — Reusable text input with label
import { View, Text, TextInput, StyleSheet } from "react-native";
import COLORS from "../../constants/colors";
import { FONTS, SIZES } from "../../constants/fonts";

export default function Input({ label, error, style, ...props }) {
  return (
    <View style={[styles.container, style]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TextInput
        style={[styles.input, error && styles.inputError]}
        placeholderTextColor={COLORS.gray}
        {...props}
      />
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 16 },
  label: {
    fontFamily: FONTS.medium,
    fontSize: SIZES.body,
    color: COLORS.black,
    marginBottom: 6,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontFamily: FONTS.body,
    fontSize: SIZES.body,
    color: COLORS.black,
    backgroundColor: COLORS.white,
  },
  inputError: { borderColor: COLORS.error },
  error: {
    fontFamily: FONTS.body,
    fontSize: SIZES.caption,
    color: COLORS.error,
    marginTop: 4,
  },
});
```

**Step 3: Create Card.js**

```jsx
// components/common/Card.js — Reusable card container with shadow
import { View, StyleSheet } from "react-native";
import COLORS from "../../constants/colors";

export default function Card({ children, style }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
});
```

**Step 4: Create LoadingSpinner.js**

```jsx
// components/common/LoadingSpinner.js — Full screen loading indicator
import { View, ActivityIndicator, StyleSheet } from "react-native";
import COLORS from "../../constants/colors";

export default function LoadingSpinner() {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={COLORS.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
  },
});
```

**Step 5: Create EmptyState.js**

```jsx
// components/common/EmptyState.js — Shown when a list has no items
import { View, Text, StyleSheet } from "react-native";
import COLORS from "../../constants/colors";
import { FONTS, SIZES } from "../../constants/fonts";

export default function EmptyState({ message = "Nothing here yet" }) {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
  },
  text: {
    fontFamily: FONTS.medium,
    fontSize: SIZES.body,
    color: COLORS.gray,
  },
});
```

**Step 6: Commit**

```bash
git add src/components/
git commit -m "feat: add shared UI components (Button, Input, Card, Loading, Empty)"
```

---

### Task 0.9: Create Navigation Structure

**Files:**
- Create: `crown-oven-frontend/src/navigation/AppNavigator.js`
- Create: `crown-oven-frontend/src/navigation/CustomerTabs.js`
- Create: `crown-oven-frontend/src/navigation/AdminDrawer.js`
- Update: `crown-oven-frontend/App.js`

**Step 1: Create CustomerTabs.js — Bottom tab navigation for customers**

```jsx
// navigation/CustomerTabs.js — Customer bottom tab navigation
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Text } from "react-native";
import COLORS from "../constants/colors";
import { FONTS } from "../constants/fonts";

// Screens (each member creates their own, these are placeholders)
import MenuScreen from "../screens/dishes/MenuScreen";
import MyOrdersScreen from "../screens/orders/MyOrdersScreen";
import TablesScreen from "../screens/tables/TablesScreen";
import ProfileScreen from "../screens/auth/ProfileScreen";

const Tab = createBottomTabNavigator();

export default function CustomerTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.gray,
        tabBarStyle: {
          backgroundColor: COLORS.white,
          borderTopColor: COLORS.lightGray,
          height: 60,
          paddingBottom: 8,
        },
        tabBarLabelStyle: {
          fontFamily: FONTS.medium,
          fontSize: 11,
        },
      }}
    >
      <Tab.Screen name="Menu" component={MenuScreen} options={{ tabBarLabel: "Home" }} />
      <Tab.Screen name="MyOrders" component={MyOrdersScreen} options={{ tabBarLabel: "Orders" }} />
      <Tab.Screen name="Tables" component={TablesScreen} options={{ tabBarLabel: "Tables" }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ tabBarLabel: "Profile" }} />
    </Tab.Navigator>
  );
}
```

**Step 2: Create AdminDrawer.js — Drawer navigation for admin**

```jsx
// navigation/AdminDrawer.js — Admin side drawer navigation
import { createDrawerNavigator } from "@react-navigation/drawer";
import COLORS from "../constants/colors";
import { FONTS } from "../constants/fonts";

// Admin screens (each member creates their own)
import ManageDishesScreen from "../screens/dishes/ManageDishesScreen";
import ManageOrdersScreen from "../screens/orders/ManageOrdersScreen";
import ManagePaymentsScreen from "../screens/payments/ManagePaymentsScreen";
import ManageTablesScreen from "../screens/tables/ManageTablesScreen";
import ManageReviewsScreen from "../screens/reviews/ManageReviewsScreen";
import ManageUsersScreen from "../screens/auth/ManageUsersScreen";
import ProfileScreen from "../screens/auth/ProfileScreen";

const Drawer = createDrawerNavigator();

export default function AdminDrawer() {
  return (
    <Drawer.Navigator
      screenOptions={{
        drawerActiveTintColor: COLORS.primary,
        drawerInactiveTintColor: COLORS.white,
        drawerStyle: {
          backgroundColor: COLORS.black,
          width: 260,
        },
        drawerLabelStyle: {
          fontFamily: FONTS.medium,
          fontSize: 14,
        },
        headerStyle: { backgroundColor: COLORS.black },
        headerTintColor: COLORS.primary,
      }}
    >
      <Drawer.Screen name="ManageOrders" component={ManageOrdersScreen} options={{ title: "Orders" }} />
      <Drawer.Screen name="ManageDishes" component={ManageDishesScreen} options={{ title: "Dishes" }} />
      <Drawer.Screen name="ManagePayments" component={ManagePaymentsScreen} options={{ title: "Payments" }} />
      <Drawer.Screen name="ManageTables" component={ManageTablesScreen} options={{ title: "Tables" }} />
      <Drawer.Screen name="ManageReviews" component={ManageReviewsScreen} options={{ title: "Reviews" }} />
      <Drawer.Screen name="ManageUsers" component={ManageUsersScreen} options={{ title: "Users" }} />
      <Drawer.Screen name="AdminProfile" component={ProfileScreen} options={{ title: "Profile" }} />
    </Drawer.Navigator>
  );
}
```

**Step 3: Create AppNavigator.js — Routes based on role**

```jsx
// navigation/AppNavigator.js — Main navigator: auth screens vs app screens
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useAuth } from "../context/AuthContext";
import LoadingSpinner from "../components/common/LoadingSpinner";

// Auth screens
import LoginScreen from "../screens/auth/LoginScreen";
import RegisterScreen from "../screens/auth/RegisterScreen";

// Role-based navigators
import CustomerTabs from "./CustomerTabs";
import AdminDrawer from "./AdminDrawer";

// Shared detail screens (accessible from both roles)
import DishDetailScreen from "../screens/dishes/DishDetailScreen";
import OrderDetailScreen from "../screens/orders/OrderDetailScreen";
import CreateOrderScreen from "../screens/orders/CreateOrderScreen";
import PaymentScreen from "../screens/payments/PaymentScreen";
import UploadProofScreen from "../screens/payments/UploadProofScreen";
import WriteReviewScreen from "../screens/reviews/WriteReviewScreen";
import DishReviewsScreen from "../screens/reviews/DishReviewsScreen";

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  const { user, loading } = useAuth();

  // Show loading while checking stored token
  if (loading) return <LoadingSpinner />;

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!user ? (
          // Not logged in — show auth screens
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
          </>
        ) : user.role === "admin" ? (
          // Admin — show drawer + detail screens
          <>
            <Stack.Screen name="AdminHome" component={AdminDrawer} />
            <Stack.Screen name="DishDetail" component={DishDetailScreen} />
            <Stack.Screen name="OrderDetail" component={OrderDetailScreen} />
          </>
        ) : (
          // Customer — show tabs + detail screens
          <>
            <Stack.Screen name="CustomerHome" component={CustomerTabs} />
            <Stack.Screen name="DishDetail" component={DishDetailScreen} />
            <Stack.Screen name="CreateOrder" component={CreateOrderScreen} />
            <Stack.Screen name="OrderDetail" component={OrderDetailScreen} />
            <Stack.Screen name="Payment" component={PaymentScreen} />
            <Stack.Screen name="UploadProof" component={UploadProofScreen} />
            <Stack.Screen name="WriteReview" component={WriteReviewScreen} />
            <Stack.Screen name="DishReviews" component={DishReviewsScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
```

**Step 4: Update App.js — Root entry point**

```jsx
// App.js — Root component with font loading and auth provider
import { useCallback } from "react";
import { View } from "react-native";
import { useFonts } from "expo-font";
import {
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
} from "@expo-google-fonts/poppins";
import { PlayfairDisplay_700Bold } from "@expo-google-fonts/playfair-display";
import * as SplashScreen from "expo-splash-screen";
import { AuthProvider } from "./src/context/AuthContext";
import AppNavigator from "./src/navigation/AppNavigator";

SplashScreen.preventAutoHideAsync();

export default function App() {
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
    PlayfairDisplay_700Bold,
  });

  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded) await SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
      <AuthProvider>
        <AppNavigator />
      </AuthProvider>
    </View>
  );
}
```

**NOTE:** At this point, the app won't run because screen files don't exist yet. Each member creates their screens in the next phases. Create placeholder screens so the app compiles — see Task 0.10.

**Step 5: Commit**

```bash
git add .
git commit -m "feat: add navigation (CustomerTabs, AdminDrawer, AppNavigator)"
```

---

### Task 0.10: Create Placeholder Screens

Create minimal placeholder for every screen so the app compiles. Each member replaces their assigned screens with real code.

**Template for all placeholders:**

```jsx
// screens/{folder}/{ScreenName}.js
import { View, Text, StyleSheet } from "react-native";
import COLORS from "../../constants/colors";

export default function ScreenName() {
  return (
    <View style={styles.container}>
      <Text>Screen Name — Coming Soon</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: COLORS.background },
});
```

**Create these placeholder files:**

```
src/screens/auth/LoginScreen.js
src/screens/auth/RegisterScreen.js
src/screens/auth/ProfileScreen.js
src/screens/auth/ManageUsersScreen.js
src/screens/dishes/MenuScreen.js
src/screens/dishes/DishDetailScreen.js
src/screens/dishes/ManageDishesScreen.js
src/screens/orders/CreateOrderScreen.js
src/screens/orders/MyOrdersScreen.js
src/screens/orders/OrderDetailScreen.js
src/screens/orders/ManageOrdersScreen.js
src/screens/payments/PaymentScreen.js
src/screens/payments/UploadProofScreen.js
src/screens/payments/ManagePaymentsScreen.js
src/screens/tables/TablesScreen.js
src/screens/tables/ManageTablesScreen.js
src/screens/reviews/WriteReviewScreen.js
src/screens/reviews/DishReviewsScreen.js
src/screens/reviews/ManageReviewsScreen.js
```

**Commit:**

```bash
git add src/screens/
git commit -m "chore: add placeholder screens for all modules"
```

---

## Phase 1: Authentication Module (Member 1)

### Task 1.1: Create User Model

**Files:**
- Create: `crown-oven-backend/models/User.js`

**Step 1: Create the model**

```js
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
      enum: ["customer", "admin"],
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
      type: String, // Cloudinary URL
    },
    isBlocked: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Index for faster email lookups
userSchema.index({ email: 1 });
userSchema.index({ role: 1 });

const User = mongoose.model("User", userSchema);
export default User;
```

**Step 2: Commit**

```bash
git add models/User.js
git commit -m "feat(auth): add User model"
```

---

### Task 1.2: Create Auth Controller

**Files:**
- Create: `crown-oven-backend/controllers/authController.js`

```js
// controllers/authController.js — Authentication and user management logic
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

// ==================== VALIDATION HELPERS ====================

// Validate email format
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Password must be 8+ chars with uppercase, lowercase, number, special char
function isStrongPassword(password) {
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/.test(password);
}

// Phone must be exactly 10 digits
function isValidPhone(phone) {
  return /^\d{10}$/.test(phone);
}

// Build JWT payload (what gets stored in the token)
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

// ==================== CONTROLLERS ====================

// POST /api/auth/register — Customer registration
export async function register(req, res) {
  try {
    const { firstName, lastName, email, password, phone, address } = req.body;

    // Validate required fields
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

    // Check if email already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({ message: "Email already registered" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user (role defaults to "customer")
    const user = await User.create({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      phone: phone || "",
      address: address || "",
    });

    // Generate JWT token
    const payload = buildTokenPayload(user);
    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || "7d",
    });

    res.status(201).json({
      message: "Registration successful",
      token,
      user: payload,
    });
  } catch (error) {
    // Handle MongoDB duplicate key error
    if (error.code === 11000) {
      return res.status(409).json({ message: "Email already registered" });
    }
    console.error("Register error:", error);
    res.status(500).json({ message: "Server error during registration" });
  }
}

// POST /api/auth/login — Login for both customer and admin
export async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // Check if blocked
    if (user.isBlocked) {
      return res.status(403).json({ message: "Your account has been blocked. Contact admin." });
    }

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // Generate JWT token
    const payload = buildTokenPayload(user);
    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || "7d",
    });

    res.json({
      message: "Login successful",
      token,
      user: payload,
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Server error during login" });
  }
}

// GET /api/auth/profile — Get current user profile
export async function getProfile(req, res) {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json(user);
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({ message: "Server error" });
  }
}

// PATCH /api/auth/profile — Update current user profile
export async function updateProfile(req, res) {
  try {
    const { firstName, lastName, phone, address } = req.body;
    const updates = {};

    if (firstName) updates.firstName = firstName.trim();
    if (lastName) updates.lastName = lastName.trim();
    if (address !== undefined) updates.address = address.trim();

    if (phone !== undefined) {
      if (phone && !isValidPhone(phone)) {
        return res.status(400).json({ message: "Phone must be exactly 10 digits" });
      }
      updates.phone = phone;
    }

    const user = await User.findByIdAndUpdate(req.user.id, updates, {
      new: true,
      runValidators: true,
    }).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ message: "Profile updated", user });
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({ message: "Server error" });
  }
}

// POST /api/auth/change-password — Change password
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
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Current password is incorrect" });
    }

    // Hash and save new password
    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.json({ message: "Password changed successfully" });
  } catch (error) {
    console.error("Change password error:", error);
    res.status(500).json({ message: "Server error" });
  }
}

// POST /api/auth/upload-avatar — Upload profile image
export async function uploadAvatar(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No image file provided" });
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { image: req.file.path },
      { new: true }
    ).select("-password");

    res.json({ message: "Avatar uploaded", user });
  } catch (error) {
    console.error("Upload avatar error:", error);
    res.status(500).json({ message: "Server error" });
  }
}

// ==================== ADMIN: USER MANAGEMENT ====================

// GET /api/admin/users — List all users
export async function listUsers(req, res) {
  try {
    const users = await User.find().select("-password").sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    console.error("List users error:", error);
    res.status(500).json({ message: "Server error" });
  }
}

// PATCH /api/admin/users/:id — Block/unblock user
export async function updateUser(req, res) {
  try {
    const { isBlocked } = req.body;

    // Prevent admin from blocking themselves
    if (req.params.id === req.user.id) {
      return res.status(400).json({ message: "You cannot modify your own account" });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isBlocked },
      { new: true }
    ).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ message: `User ${isBlocked ? "blocked" : "unblocked"}`, user });
  } catch (error) {
    console.error("Update user error:", error);
    res.status(500).json({ message: "Server error" });
  }
}

// DELETE /api/admin/users/:id — Delete user
export async function deleteUser(req, res) {
  try {
    // Prevent admin from deleting themselves
    if (req.params.id === req.user.id) {
      return res.status(400).json({ message: "You cannot delete your own account" });
    }

    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ message: "User deleted" });
  } catch (error) {
    console.error("Delete user error:", error);
    res.status(500).json({ message: "Server error" });
  }
}
```

**Commit:**

```bash
git add controllers/authController.js
git commit -m "feat(auth): add auth controller with register, login, profile, admin user management"
```

---

### Task 1.3: Create Auth Routes

**Files:**
- Update: `crown-oven-backend/routes/authRoutes.js`

```js
// routes/authRoutes.js — Authentication and user management routes
import { Router } from "express";
import requireAuth from "../middleware/requireAuth.js";
import requireAdmin from "../middleware/requireAdmin.js";
import { uploadAvatar } from "../config/cloudinary.js";
import {
  register,
  login,
  getProfile,
  updateProfile,
  changePassword,
  uploadAvatar as uploadAvatarHandler,
  listUsers,
  updateUser,
  deleteUser,
} from "../controllers/authController.js";

const router = Router();

// Public routes
router.post("/register", register);
router.post("/login", login);

// Protected routes (logged-in users)
router.get("/profile", requireAuth, getProfile);
router.patch("/profile", requireAuth, updateProfile);
router.post("/change-password", requireAuth, changePassword);
router.post("/upload-avatar", requireAuth, uploadAvatar.single("image"), uploadAvatarHandler);

// Admin routes — mounted at /api/auth but accessed via /api/admin/users in app.js
// We add admin user routes here under /admin prefix
router.get("/admin/users", requireAuth, requireAdmin, listUsers);
router.patch("/admin/users/:id", requireAuth, requireAdmin, updateUser);
router.delete("/admin/users/:id", requireAuth, requireAdmin, deleteUser);

export default router;
```

**Commit:**

```bash
git add routes/authRoutes.js
git commit -m "feat(auth): add auth routes"
```

---

### Task 1.4: Create Auth Service (Frontend)

**Files:**
- Create: `crown-oven-frontend/src/services/authService.js`

```js
// services/authService.js — API calls for authentication module
import API from "../constants/api";

// Register new customer
export const registerUser = (data) => API.post("/auth/register", data);

// Login
export const loginUser = (data) => API.post("/auth/login", data);

// Get my profile
export const getProfile = () => API.get("/auth/profile");

// Update my profile
export const updateProfile = (data) => API.patch("/auth/profile", data);

// Change password
export const changePassword = (data) => API.post("/auth/change-password", data);

// Upload avatar (FormData with image)
export const uploadAvatar = (formData) =>
  API.post("/auth/upload-avatar", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

// Admin: list all users
export const listUsers = () => API.get("/auth/admin/users");

// Admin: block/unblock user
export const updateUser = (id, data) => API.patch(`/auth/admin/users/${id}`, data);

// Admin: delete user
export const deleteUser = (id) => API.delete(`/auth/admin/users/${id}`);
```

**Commit:**

```bash
git add src/services/authService.js
git commit -m "feat(auth): add auth API service"
```

---

## Phase 2: Dishes / Catalog Module (Member 2)

### Task 2.1: Create Dish Model

**Files:**
- Create: `crown-oven-backend/models/Dish.js`

```js
// models/Dish.js — Menu dish schema
import mongoose from "mongoose";

const dishSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Dish name is required"],
      unique: true,
      trim: true,
    },
    category: {
      type: String,
      required: [true, "Category is required"],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    price: {
      type: Number,
      required: [true, "Price is required"],
      min: [1, "Price must be greater than 0"],
    },
    imageUrl: {
      type: String,
      trim: true,
    },
    isAvailable: {
      type: Boolean,
      default: true,
    },
    // Backend-calculated fields (updated by review module)
    averageRating: {
      type: Number,
      min: 0,
      max: 5,
      default: 0,
    },
    ratingCount: {
      type: Number,
      min: 0,
      default: 0,
    },
  },
  { timestamps: true, collection: "dishes" }
);

dishSchema.index({ name: 1 }, { unique: true });
dishSchema.index({ category: 1 });
dishSchema.index({ isAvailable: 1 });

const Dish = mongoose.model("Dish", dishSchema);
export default Dish;
```

**Commit:**

```bash
git add models/Dish.js
git commit -m "feat(dishes): add Dish model"
```

---

### Task 2.2: Create Dish Controller

**Files:**
- Create: `crown-oven-backend/controllers/dishController.js`

```js
// controllers/dishController.js — Dish/catalog business logic
import Dish from "../models/Dish.js";
import Review from "../models/Review.js";

// GET /api/dishes — Public: list available dishes
export async function listPublicDishes(req, res) {
  try {
    const { category, search } = req.query;
    const filter = { isAvailable: true };

    // Optional category filter
    if (category) filter.category = category;

    // Optional search by name
    if (search) filter.name = { $regex: search, $options: "i" };

    const dishes = await Dish.find(filter).sort({ name: 1 }).lean();
    res.json(dishes);
  } catch (error) {
    console.error("List public dishes error:", error);
    res.status(500).json({ message: "Server error" });
  }
}

// GET /api/dishes/:id — Public: get single dish
export async function getDishById(req, res) {
  try {
    const dish = await Dish.findById(req.params.id).lean();
    if (!dish) {
      return res.status(404).json({ message: "Dish not found" });
    }
    res.json(dish);
  } catch (error) {
    console.error("Get dish error:", error);
    res.status(500).json({ message: "Server error" });
  }
}

// POST /api/admin/dishes — Admin: add new dish
export async function addDish(req, res) {
  try {
    const { name, category, description, price } = req.body;

    if (!name || !category || !price) {
      return res.status(400).json({ message: "Name, category, and price are required" });
    }

    if (price <= 0) {
      return res.status(400).json({ message: "Price must be greater than 0" });
    }

    // Check if dish name already exists
    const existing = await Dish.findOne({ name: name.trim() });
    if (existing) {
      return res.status(409).json({ message: "A dish with this name already exists" });
    }

    const dish = await Dish.create({
      name: name.trim(),
      category: category.trim(),
      description: description?.trim() || "",
      price,
      imageUrl: req.file?.path || "", // Cloudinary URL from multer
    });

    res.status(201).json({ message: "Dish added", dish });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: "Dish name already exists" });
    }
    console.error("Add dish error:", error);
    res.status(500).json({ message: "Server error" });
  }
}

// PATCH /api/admin/dishes/:id — Admin: update dish
export async function updateDish(req, res) {
  try {
    const { name, category, description, price, isAvailable } = req.body;
    const updates = {};

    if (name) updates.name = name.trim();
    if (category) updates.category = category.trim();
    if (description !== undefined) updates.description = description.trim();
    if (price !== undefined) {
      if (price <= 0) return res.status(400).json({ message: "Price must be greater than 0" });
      updates.price = price;
    }
    if (isAvailable !== undefined) updates.isAvailable = isAvailable;
    if (req.file) updates.imageUrl = req.file.path; // New image uploaded

    const dish = await Dish.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    });

    if (!dish) {
      return res.status(404).json({ message: "Dish not found" });
    }

    res.json({ message: "Dish updated", dish });
  } catch (error) {
    console.error("Update dish error:", error);
    res.status(500).json({ message: "Server error" });
  }
}

// DELETE /api/admin/dishes/:id — Admin: delete dish and its reviews
export async function deleteDish(req, res) {
  try {
    const dish = await Dish.findByIdAndDelete(req.params.id);
    if (!dish) {
      return res.status(404).json({ message: "Dish not found" });
    }

    // Also delete all reviews for this dish
    await Review.deleteMany({ dishId: req.params.id });

    res.json({ message: "Dish and related reviews deleted" });
  } catch (error) {
    console.error("Delete dish error:", error);
    res.status(500).json({ message: "Server error" });
  }
}
```

**Commit:**

```bash
git add controllers/dishController.js
git commit -m "feat(dishes): add dish controller with CRUD and validation"
```

---

### Task 2.3: Create Dish Routes

**Files:**
- Update: `crown-oven-backend/routes/dishRoutes.js`

```js
// routes/dishRoutes.js — Dish/catalog routes
import { Router } from "express";
import requireAuth from "../middleware/requireAuth.js";
import requireAdmin from "../middleware/requireAdmin.js";
import { uploadDishImage } from "../config/cloudinary.js";
import {
  listPublicDishes,
  getDishById,
  addDish,
  updateDish,
  deleteDish,
} from "../controllers/dishController.js";

const router = Router();

// Public routes (no auth needed)
router.get("/", listPublicDishes);
router.get("/:id", getDishById);

// Admin routes
router.post("/admin", requireAuth, requireAdmin, uploadDishImage.single("image"), addDish);
router.patch("/admin/:id", requireAuth, requireAdmin, uploadDishImage.single("image"), updateDish);
router.delete("/admin/:id", requireAuth, requireAdmin, deleteDish);

export default router;
```

**NOTE:** In app.js, this is mounted as `app.use("/api/dishes", dishRoutes)`, so admin routes become `/api/dishes/admin` and `/api/dishes/admin/:id`.

**Commit:**

```bash
git add routes/dishRoutes.js
git commit -m "feat(dishes): add dish routes"
```

---

### Task 2.4: Create Dish Service (Frontend)

**Files:**
- Create: `crown-oven-frontend/src/services/dishService.js`

```js
// services/dishService.js — API calls for dishes module
import API from "../constants/api";

// Public: list available dishes
export const getPublicDishes = (params) => API.get("/dishes", { params });

// Public: get single dish
export const getDishById = (id) => API.get(`/dishes/${id}`);

// Admin: add dish (FormData with image)
export const addDish = (formData) =>
  API.post("/dishes/admin", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

// Admin: update dish
export const updateDish = (id, formData) =>
  API.patch(`/dishes/admin/${id}`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

// Admin: delete dish
export const deleteDish = (id) => API.delete(`/dishes/admin/${id}`);
```

**Commit:**

```bash
git add src/services/dishService.js
git commit -m "feat(dishes): add dish API service"
```

---

## Phase 3: Order Module (Member 3)

### Task 3.1: Create Order Model

**Files:**
- Create: `crown-oven-backend/models/Order.js`

```js
// models/Order.js — Order schema with embedded items
import mongoose from "mongoose";

// Embedded subdocument for order items (snapshot of dish at order time)
const orderItemSchema = new mongoose.Schema(
  {
    dishId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Dish",
      required: true,
    },
    name: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1, max: 20 },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      required: true,
      unique: true,
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    orderType: {
      type: String,
      enum: ["dine-in", "takeaway", "delivery"],
      required: [true, "Order type is required"],
    },
    items: {
      type: [orderItemSchema],
      required: true,
      validate: [arr => arr.length > 0, "Order must have at least one item"],
    },
    // BACKEND CALCULATED — never trust frontend
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ["Pending", "Preparing", "Ready", "Served", "Delivered", "Collected", "Cancelled"],
      default: "Pending",
    },
    paymentStatus: {
      type: String,
      enum: ["unpaid", "paid"],
      default: "unpaid",
    },
    // Dine-in specific
    tableId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DiningTable",
    },
    timeSlot: { type: String, trim: true },
    seatCount: { type: Number, min: 1 },
    // Delivery specific
    deliveryAddress: { type: String, trim: true },
    // Customer info
    customerName: { type: String, trim: true },
    phone: { type: String, trim: true },
  },
  { timestamps: true }
);

orderSchema.index({ customerId: 1, createdAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ orderType: 1, tableId: 1, timeSlot: 1 });

const Order = mongoose.model("Order", orderSchema);
export default Order;
```

**Commit:**

```bash
git add models/Order.js
git commit -m "feat(orders): add Order model with embedded items"
```

---

### Task 3.2: Create Order Controller

**Files:**
- Create: `crown-oven-backend/controllers/orderController.js`

```js
// controllers/orderController.js — Order business logic with backend calculations
import Order from "../models/Order.js";
import Dish from "../models/Dish.js";
import DiningTable from "../models/DiningTable.js";
import { generateOrderNumber } from "../utils/helpers.js";

// POST /api/orders — Customer: create new order
export async function createOrder(req, res) {
  try {
    const { orderType, items, tableId, timeSlot, seatCount, deliveryAddress, customerName, phone } = req.body;

    // Validate order type
    if (!["dine-in", "takeaway", "delivery"].includes(orderType)) {
      return res.status(400).json({ message: "Invalid order type. Must be dine-in, takeaway, or delivery" });
    }

    // Validate items exist
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "Order must have at least one item" });
    }

    // === ORDER TYPE SPECIFIC VALIDATION ===

    // Dine-in requires table + time slot + seat count
    if (orderType === "dine-in") {
      if (!tableId || !timeSlot || !seatCount) {
        return res.status(400).json({ message: "Dine-in orders require tableId, timeSlot, and seatCount" });
      }

      // Check table exists
      const table = await DiningTable.findById(tableId);
      if (!table) {
        return res.status(404).json({ message: "Table not found" });
      }
      if (!table.isAvailable) {
        return res.status(400).json({ message: "This table is currently not available" });
      }

      // Check seat availability for this table + time slot
      const bookedOrders = await Order.find({
        tableId,
        timeSlot: timeSlot.toUpperCase(),
        status: { $nin: ["Cancelled"] }, // Only count active orders
      });

      const bookedSeats = bookedOrders.reduce((sum, o) => sum + (o.seatCount || 0), 0);
      const availableSeats = table.seats - bookedSeats;

      if (seatCount > availableSeats) {
        return res.status(400).json({
          message: `Only ${availableSeats} seats available for this table at ${timeSlot}`,
        });
      }
    }

    // Delivery requires address
    if (orderType === "delivery") {
      if (!deliveryAddress || !deliveryAddress.trim()) {
        return res.status(400).json({ message: "Delivery orders require a delivery address" });
      }
    }

    // === CALCULATE ORDER TOTAL FROM DATABASE PRICES (NEVER TRUST FRONTEND) ===

    const orderItems = [];
    let totalAmount = 0;

    for (const item of items) {
      if (!item.dishId || !item.quantity || item.quantity < 1) {
        return res.status(400).json({ message: "Each item needs a dishId and quantity (min 1)" });
      }

      if (item.quantity > 20) {
        return res.status(400).json({ message: "Maximum 20 of each item per order" });
      }

      // Fetch REAL price from database
      const dish = await Dish.findById(item.dishId);
      if (!dish) {
        return res.status(404).json({ message: `Dish not found: ${item.dishId}` });
      }
      if (!dish.isAvailable) {
        return res.status(400).json({ message: `${dish.name} is currently unavailable` });
      }

      // Use database price, not frontend price
      orderItems.push({
        dishId: dish._id,
        name: dish.name,
        price: dish.price,
        quantity: item.quantity,
      });

      // Backend calculates total
      totalAmount += dish.price * item.quantity;
    }

    // Create order with backend-calculated total
    const order = await Order.create({
      orderNumber: generateOrderNumber(),
      customerId: req.user.id,
      orderType,
      items: orderItems,
      totalAmount, // CALCULATED BY BACKEND
      tableId: orderType === "dine-in" ? tableId : undefined,
      timeSlot: orderType === "dine-in" ? timeSlot.toUpperCase() : undefined,
      seatCount: orderType === "dine-in" ? seatCount : undefined,
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

// GET /api/orders/my — Customer: get my orders
export async function getMyOrders(req, res) {
  try {
    const orders = await Order.find({ customerId: req.user.id })
      .sort({ createdAt: -1 })
      .populate("tableId", "tableNo seats location")
      .lean();

    res.json(orders);
  } catch (error) {
    console.error("Get my orders error:", error);
    res.status(500).json({ message: "Server error" });
  }
}

// GET /api/orders/:id — Get single order
export async function getOrderById(req, res) {
  try {
    const order = await Order.findById(req.params.id)
      .populate("tableId", "tableNo seats location")
      .lean();

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Customers can only view their own orders
    if (req.user.role !== "admin" && order.customerId.toString() !== req.user.id) {
      return res.status(403).json({ message: "Access denied" });
    }

    res.json(order);
  } catch (error) {
    console.error("Get order error:", error);
    res.status(500).json({ message: "Server error" });
  }
}

// PATCH /api/orders/:id/cancel — Customer: cancel order
export async function cancelOrder(req, res) {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Customer can only cancel their own orders
    if (req.user.role !== "admin" && order.customerId.toString() !== req.user.id) {
      return res.status(403).json({ message: "Access denied" });
    }

    // Cannot cancel already completed orders
    if (["Served", "Delivered", "Collected", "Cancelled"].includes(order.status)) {
      return res.status(400).json({ message: `Cannot cancel order with status: ${order.status}` });
    }

    order.status = "Cancelled";
    await order.save();

    res.json({ message: "Order cancelled", order });
  } catch (error) {
    console.error("Cancel order error:", error);
    res.status(500).json({ message: "Server error" });
  }
}

// GET /api/admin/orders — Admin: list all orders
export async function listAllOrders(req, res) {
  try {
    const { status, orderType } = req.query;
    const filter = {};

    if (status) filter.status = status;
    if (orderType) filter.orderType = orderType;

    const orders = await Order.find(filter)
      .sort({ createdAt: -1 })
      .populate("tableId", "tableNo seats location")
      .lean();

    res.json(orders);
  } catch (error) {
    console.error("List all orders error:", error);
    res.status(500).json({ message: "Server error" });
  }
}

// PATCH /api/admin/orders/:id/status — Admin: update order status
export async function updateOrderStatus(req, res) {
  try {
    const { status } = req.body;
    const validStatuses = ["Pending", "Preparing", "Ready", "Served", "Delivered", "Collected", "Cancelled"];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: `Invalid status. Must be one of: ${validStatuses.join(", ")}` });
    }

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    res.json({ message: `Order status updated to ${status}`, order });
  } catch (error) {
    console.error("Update order status error:", error);
    res.status(500).json({ message: "Server error" });
  }
}
```

**Commit:**

```bash
git add controllers/orderController.js
git commit -m "feat(orders): add order controller with backend total calculation and validation"
```

---

### Task 3.3: Create Order Routes

**Files:**
- Update: `crown-oven-backend/routes/orderRoutes.js`

```js
// routes/orderRoutes.js — Order routes
import { Router } from "express";
import requireAuth from "../middleware/requireAuth.js";
import requireAdmin from "../middleware/requireAdmin.js";
import {
  createOrder,
  getMyOrders,
  getOrderById,
  cancelOrder,
  listAllOrders,
  updateOrderStatus,
} from "../controllers/orderController.js";

const router = Router();

// Customer routes
router.post("/", requireAuth, createOrder);
router.get("/my", requireAuth, getMyOrders);
router.get("/:id", requireAuth, getOrderById);
router.patch("/:id/cancel", requireAuth, cancelOrder);

// Admin routes
router.get("/admin/all", requireAuth, requireAdmin, listAllOrders);
router.patch("/admin/:id/status", requireAuth, requireAdmin, updateOrderStatus);

export default router;
```

**Commit:**

```bash
git add routes/orderRoutes.js
git commit -m "feat(orders): add order routes"
```

---

### Task 3.4: Create Order Service (Frontend)

**Files:**
- Create: `crown-oven-frontend/src/services/orderService.js`

```js
// services/orderService.js — API calls for orders module
import API from "../constants/api";

// Customer: create order
export const createOrder = (data) => API.post("/orders", data);

// Customer: get my orders
export const getMyOrders = () => API.get("/orders/my");

// Get single order
export const getOrderById = (id) => API.get(`/orders/${id}`);

// Customer: cancel order
export const cancelOrder = (id) => API.patch(`/orders/${id}/cancel`);

// Admin: list all orders
export const listAllOrders = (params) => API.get("/orders/admin/all", { params });

// Admin: update order status
export const updateOrderStatus = (id, status) => API.patch(`/orders/admin/${id}/status`, { status });
```

**Commit:**

```bash
git add src/services/orderService.js
git commit -m "feat(orders): add order API service"
```

---

## Phase 4: Payment Module (Member 4)

### Task 4.1: Create Payment Model

**Files:**
- Create: `crown-oven-backend/models/Payment.js`

```js
// models/Payment.js — Payment schema with proof upload and refund workflow
import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
  {
    paymentId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      unique: true, // One payment per order (prevents duplicates)
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // MUST match order.totalAmount — validated by backend
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    paymentMethod: {
      type: String,
      enum: ["cash", "bank_transfer"],
      required: true,
    },
    proofImageUrl: {
      type: String, // Cloudinary URL for bank slip
    },
    status: {
      type: String,
      enum: ["pending", "submitted", "verified", "rejected"],
      default: "pending",
    },
    // Refund workflow
    refundStatus: {
      type: String,
      enum: ["none", "requested", "approved", "rejected"],
      default: "none",
    },
    refundRequestedAt: { type: Date },
    refundReviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

paymentSchema.index({ orderId: 1 });
paymentSchema.index({ customerId: 1 });
paymentSchema.index({ status: 1 });

const Payment = mongoose.model("Payment", paymentSchema);
export default Payment;
```

**Commit:**

```bash
git add models/Payment.js
git commit -m "feat(payments): add Payment model"
```

---

### Task 4.2: Create Payment Controller

**Files:**
- Create: `crown-oven-backend/controllers/paymentController.js`

```js
// controllers/paymentController.js — Payment logic with validation
import Payment from "../models/Payment.js";
import Order from "../models/Order.js";
import { generatePaymentId } from "../utils/helpers.js";

// POST /api/payments — Customer: create payment
export async function createPayment(req, res) {
  try {
    const { orderId, paymentMethod } = req.body;

    if (!orderId || !paymentMethod) {
      return res.status(400).json({ message: "orderId and paymentMethod are required" });
    }

    if (!["cash", "bank_transfer"].includes(paymentMethod)) {
      return res.status(400).json({ message: "Payment method must be cash or bank_transfer" });
    }

    // Fetch order
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Customer can only pay for their own orders
    if (order.customerId.toString() !== req.user.id) {
      return res.status(403).json({ message: "You can only pay for your own orders" });
    }

    // Prevent duplicate payments
    const existingPayment = await Payment.findOne({ orderId });
    if (existingPayment) {
      return res.status(409).json({ message: "Payment already exists for this order" });
    }

    // Prevent payment for cancelled orders
    if (order.status === "Cancelled") {
      return res.status(400).json({ message: "Cannot pay for a cancelled order" });
    }

    // Amount MUST match order total (backend validates this)
    const payment = await Payment.create({
      paymentId: generatePaymentId(),
      orderId: order._id,
      customerId: req.user.id,
      amount: order.totalAmount, // Always use order total, never frontend value
      paymentMethod,
      status: "pending",
    });

    res.status(201).json({ message: "Payment created", payment });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: "Payment already exists for this order" });
    }
    console.error("Create payment error:", error);
    res.status(500).json({ message: "Server error" });
  }
}

// POST /api/payments/:id/upload-proof — Customer: upload bank slip
export async function uploadProof(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No proof image provided" });
    }

    const payment = await Payment.findById(req.params.id);
    if (!payment) {
      return res.status(404).json({ message: "Payment not found" });
    }

    // Only the customer who created the payment can upload proof
    if (payment.customerId.toString() !== req.user.id) {
      return res.status(403).json({ message: "Access denied" });
    }

    if (payment.paymentMethod !== "bank_transfer") {
      return res.status(400).json({ message: "Proof upload is only for bank transfers" });
    }

    // Update with proof image and change status to submitted
    payment.proofImageUrl = req.file.path;
    payment.status = "submitted";
    await payment.save();

    res.json({ message: "Payment proof uploaded", payment });
  } catch (error) {
    console.error("Upload proof error:", error);
    res.status(500).json({ message: "Server error" });
  }
}

// GET /api/payments/order/:orderId — Get payment by order
export async function getPaymentByOrder(req, res) {
  try {
    const payment = await Payment.findOne({ orderId: req.params.orderId })
      .populate("orderId", "orderNumber totalAmount status")
      .lean();

    if (!payment) {
      return res.status(404).json({ message: "Payment not found for this order" });
    }

    // Customer can only view their own payments
    if (req.user.role !== "admin" && payment.customerId.toString() !== req.user.id) {
      return res.status(403).json({ message: "Access denied" });
    }

    res.json(payment);
  } catch (error) {
    console.error("Get payment error:", error);
    res.status(500).json({ message: "Server error" });
  }
}

// POST /api/payments/:id/refund — Customer: request refund
export async function requestRefund(req, res) {
  try {
    const payment = await Payment.findById(req.params.id);
    if (!payment) {
      return res.status(404).json({ message: "Payment not found" });
    }

    if (payment.customerId.toString() !== req.user.id) {
      return res.status(403).json({ message: "Access denied" });
    }

    // Can only refund verified payments
    if (payment.status !== "verified") {
      return res.status(400).json({ message: "Can only request refund for verified payments" });
    }

    // Prevent duplicate refund requests
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

// GET /api/admin/payments — Admin: list all payments
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

// PATCH /api/admin/payments/:id/verify — Admin: verify/reject bank proof
export async function verifyPayment(req, res) {
  try {
    const { action } = req.body; // "verify" or "reject"

    if (!["verify", "reject"].includes(action)) {
      return res.status(400).json({ message: "Action must be 'verify' or 'reject'" });
    }

    const payment = await Payment.findById(req.params.id);
    if (!payment) {
      return res.status(404).json({ message: "Payment not found" });
    }

    if (payment.status !== "submitted" && payment.status !== "pending") {
      return res.status(400).json({ message: `Cannot verify payment with status: ${payment.status}` });
    }

    if (action === "verify") {
      payment.status = "verified";

      // Also mark the order as paid
      await Order.findByIdAndUpdate(payment.orderId, { paymentStatus: "paid" });
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

// PATCH /api/admin/payments/:id/refund-review — Admin: approve/reject refund
export async function reviewRefund(req, res) {
  try {
    const { action } = req.body; // "approve" or "reject"

    if (!["approve", "reject"].includes(action)) {
      return res.status(400).json({ message: "Action must be 'approve' or 'reject'" });
    }

    const payment = await Payment.findById(req.params.id);
    if (!payment) {
      return res.status(404).json({ message: "Payment not found" });
    }

    if (payment.refundStatus !== "requested") {
      return res.status(400).json({ message: "No refund request pending" });
    }

    payment.refundStatus = action === "approve" ? "approved" : "rejected";
    payment.refundReviewedBy = req.user.id;
    await payment.save();

    res.json({ message: `Refund ${action}d`, payment });
  } catch (error) {
    console.error("Review refund error:", error);
    res.status(500).json({ message: "Server error" });
  }
}
```

**Commit:**

```bash
git add controllers/paymentController.js
git commit -m "feat(payments): add payment controller with proof upload and refund flow"
```

---

### Task 4.3: Create Payment Routes

**Files:**
- Update: `crown-oven-backend/routes/paymentRoutes.js`

```js
// routes/paymentRoutes.js — Payment routes
import { Router } from "express";
import requireAuth from "../middleware/requireAuth.js";
import requireAdmin from "../middleware/requireAdmin.js";
import { uploadProofImage } from "../config/cloudinary.js";
import {
  createPayment,
  uploadProof,
  getPaymentByOrder,
  requestRefund,
  listAllPayments,
  verifyPayment,
  reviewRefund,
} from "../controllers/paymentController.js";

const router = Router();

// Customer routes
router.post("/", requireAuth, createPayment);
router.post("/:id/upload-proof", requireAuth, uploadProofImage.single("proof"), uploadProof);
router.get("/order/:orderId", requireAuth, getPaymentByOrder);
router.post("/:id/refund", requireAuth, requestRefund);

// Admin routes
router.get("/admin/all", requireAuth, requireAdmin, listAllPayments);
router.patch("/admin/:id/verify", requireAuth, requireAdmin, verifyPayment);
router.patch("/admin/:id/refund-review", requireAuth, requireAdmin, reviewRefund);

export default router;
```

**Commit:**

```bash
git add routes/paymentRoutes.js
git commit -m "feat(payments): add payment routes"
```

---

### Task 4.4: Create Payment Service (Frontend)

**Files:**
- Create: `crown-oven-frontend/src/services/paymentService.js`

```js
// services/paymentService.js — API calls for payments module
import API from "../constants/api";

// Customer: create payment
export const createPayment = (data) => API.post("/payments", data);

// Customer: upload bank proof (FormData)
export const uploadProof = (id, formData) =>
  API.post(`/payments/${id}/upload-proof`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

// Get payment by order
export const getPaymentByOrder = (orderId) => API.get(`/payments/order/${orderId}`);

// Customer: request refund
export const requestRefund = (id) => API.post(`/payments/${id}/refund`);

// Admin: list all payments
export const listAllPayments = (params) => API.get("/payments/admin/all", { params });

// Admin: verify/reject payment proof
export const verifyPayment = (id, action) => API.patch(`/payments/admin/${id}/verify`, { action });

// Admin: approve/reject refund
export const reviewRefund = (id, action) => API.patch(`/payments/admin/${id}/refund-review`, { action });
```

**Commit:**

```bash
git add src/services/paymentService.js
git commit -m "feat(payments): add payment API service"
```

---

## Phase 5: Dining Tables Module (Member 5)

### Task 5.1: Create DiningTable Model

**Files:**
- Create: `crown-oven-backend/models/DiningTable.js`

```js
// models/DiningTable.js — Restaurant table schema
import mongoose from "mongoose";

const diningTableSchema = new mongoose.Schema(
  {
    tableNo: {
      type: String,
      required: [true, "Table number is required"],
      unique: true,
      trim: true,
    },
    seats: {
      type: Number,
      required: [true, "Seat count is required"],
      enum: {
        values: [2, 4],
        message: "Seats must be 2 or 4",
      },
      default: 2,
    },
    location: {
      type: String,
      enum: ["indoor", "outdoor"],
      default: "indoor",
    },
    isAvailable: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true, collection: "tables" }
);

diningTableSchema.index({ tableNo: 1 }, { unique: true });

const DiningTable = mongoose.model("DiningTable", diningTableSchema);
export default DiningTable;
```

**Commit:**

```bash
git add models/DiningTable.js
git commit -m "feat(tables): add DiningTable model"
```

---

### Task 5.2: Create Table Controller

**Files:**
- Create: `crown-oven-backend/controllers/tableController.js`

```js
// controllers/tableController.js — Table management with availability logic
import DiningTable from "../models/DiningTable.js";
import Order from "../models/Order.js";

// GET /api/tables — List all tables with availability info
export async function listTables(req, res) {
  try {
    const tables = await DiningTable.find().sort({ tableNo: 1 }).lean();
    res.json(tables);
  } catch (error) {
    console.error("List tables error:", error);
    res.status(500).json({ message: "Server error" });
  }
}

// GET /api/tables/available — Get available tables for a specific time slot
export async function getAvailableTables(req, res) {
  try {
    const { timeSlot } = req.query;

    if (!timeSlot) {
      return res.status(400).json({ message: "timeSlot query parameter is required" });
    }

    const tables = await DiningTable.find({ isAvailable: true }).sort({ tableNo: 1 }).lean();

    // For each table, calculate available seats at this time slot
    const tablesWithAvailability = await Promise.all(
      tables.map(async (table) => {
        // Count booked seats for active orders at this time slot
        const bookedOrders = await Order.find({
          tableId: table._id,
          timeSlot: timeSlot.toUpperCase(),
          status: { $nin: ["Cancelled"] },
        });

        const bookedSeats = bookedOrders.reduce((sum, o) => sum + (o.seatCount || 0), 0);
        const availableSeats = table.seats - bookedSeats;

        return {
          ...table,
          bookedSeats,
          availableSeats,
          hasSpace: availableSeats > 0,
        };
      })
    );

    res.json(tablesWithAvailability);
  } catch (error) {
    console.error("Get available tables error:", error);
    res.status(500).json({ message: "Server error" });
  }
}

// POST /api/admin/tables — Admin: add new table
export async function addTable(req, res) {
  try {
    const { tableNo, seats, location } = req.body;

    if (!tableNo) {
      return res.status(400).json({ message: "Table number is required" });
    }

    if (seats && ![2, 4].includes(seats)) {
      return res.status(400).json({ message: "Seats must be 2 or 4" });
    }

    if (location && !["indoor", "outdoor"].includes(location)) {
      return res.status(400).json({ message: "Location must be indoor or outdoor" });
    }

    const existing = await DiningTable.findOne({ tableNo: tableNo.trim() });
    if (existing) {
      return res.status(409).json({ message: "Table number already exists" });
    }

    const table = await DiningTable.create({
      tableNo: tableNo.trim(),
      seats: seats || 2,
      location: location || "indoor",
    });

    res.status(201).json({ message: "Table added", table });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: "Table number already exists" });
    }
    console.error("Add table error:", error);
    res.status(500).json({ message: "Server error" });
  }
}

// PATCH /api/admin/tables/:id — Admin: update table
export async function updateTable(req, res) {
  try {
    const { tableNo, seats, location, isAvailable } = req.body;
    const updates = {};

    if (tableNo) updates.tableNo = tableNo.trim();
    if (seats !== undefined) {
      if (![2, 4].includes(seats)) {
        return res.status(400).json({ message: "Seats must be 2 or 4" });
      }
      updates.seats = seats;
    }
    if (location) {
      if (!["indoor", "outdoor"].includes(location)) {
        return res.status(400).json({ message: "Location must be indoor or outdoor" });
      }
      updates.location = location;
    }
    if (isAvailable !== undefined) updates.isAvailable = isAvailable;

    const table = await DiningTable.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    });

    if (!table) {
      return res.status(404).json({ message: "Table not found" });
    }

    res.json({ message: "Table updated", table });
  } catch (error) {
    console.error("Update table error:", error);
    res.status(500).json({ message: "Server error" });
  }
}

// DELETE /api/admin/tables/:id — Admin: delete table
export async function deleteTable(req, res) {
  try {
    // Check for active orders on this table
    const activeOrders = await Order.countDocuments({
      tableId: req.params.id,
      status: { $nin: ["Cancelled", "Served", "Delivered", "Collected"] },
    });

    if (activeOrders > 0) {
      return res.status(400).json({
        message: `Cannot delete: ${activeOrders} active order(s) on this table`,
      });
    }

    const table = await DiningTable.findByIdAndDelete(req.params.id);
    if (!table) {
      return res.status(404).json({ message: "Table not found" });
    }

    res.json({ message: "Table deleted" });
  } catch (error) {
    console.error("Delete table error:", error);
    res.status(500).json({ message: "Server error" });
  }
}
```

**Commit:**

```bash
git add controllers/tableController.js
git commit -m "feat(tables): add table controller with availability calculation"
```

---

### Task 5.3: Create Table Routes

**Files:**
- Update: `crown-oven-backend/routes/tableRoutes.js`

```js
// routes/tableRoutes.js — Table routes
import { Router } from "express";
import requireAuth from "../middleware/requireAuth.js";
import requireAdmin from "../middleware/requireAdmin.js";
import {
  listTables,
  getAvailableTables,
  addTable,
  updateTable,
  deleteTable,
} from "../controllers/tableController.js";

const router = Router();

// Customer routes
router.get("/", requireAuth, listTables);
router.get("/available", requireAuth, getAvailableTables);

// Admin routes
router.post("/admin", requireAuth, requireAdmin, addTable);
router.patch("/admin/:id", requireAuth, requireAdmin, updateTable);
router.delete("/admin/:id", requireAuth, requireAdmin, deleteTable);

export default router;
```

**Commit:**

```bash
git add routes/tableRoutes.js
git commit -m "feat(tables): add table routes"
```

---

### Task 5.4: Create Table Service (Frontend)

**Files:**
- Create: `crown-oven-frontend/src/services/tableService.js`

```js
// services/tableService.js — API calls for tables module
import API from "../constants/api";

// List all tables
export const listTables = () => API.get("/tables");

// Get available tables for a time slot
export const getAvailableTables = (timeSlot) => API.get("/tables/available", { params: { timeSlot } });

// Admin: add table
export const addTable = (data) => API.post("/tables/admin", data);

// Admin: update table
export const updateTable = (id, data) => API.patch(`/tables/admin/${id}`, data);

// Admin: delete table
export const deleteTable = (id) => API.delete(`/tables/admin/${id}`);
```

**Commit:**

```bash
git add src/services/tableService.js
git commit -m "feat(tables): add table API service"
```

---

## Phase 6: Review / Rating Module (Member 6)

### Task 6.1: Create Review Model

**Files:**
- Create: `crown-oven-backend/models/Review.js`

```js
// models/Review.js — Customer review schema
import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema(
  {
    dishId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Dish",
      required: [true, "Dish ID is required"],
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    customerName: {
      type: String,
      required: true,
      trim: true,
    },
    rating: {
      type: Number,
      required: [true, "Rating is required"],
      min: [1, "Rating must be at least 1"],
      max: [5, "Rating cannot exceed 5"],
    },
    comment: {
      type: String,
      trim: true,
      maxlength: [220, "Comment cannot exceed 220 characters"],
      default: "",
    },
  },
  { timestamps: true, collection: "reviews" }
);

// One review per customer per dish
reviewSchema.index({ dishId: 1, customerId: 1 }, { unique: true });
reviewSchema.index({ dishId: 1, createdAt: -1 });

const Review = mongoose.model("Review", reviewSchema);
export default Review;
```

**Commit:**

```bash
git add models/Review.js
git commit -m "feat(reviews): add Review model with unique constraint"
```

---

### Task 6.2: Create Review Controller

**Files:**
- Create: `crown-oven-backend/controllers/reviewController.js`

```js
// controllers/reviewController.js — Review logic with rating aggregation
import Review from "../models/Review.js";
import Dish from "../models/Dish.js";

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
    // Round to 1 decimal place
    await Dish.findByIdAndUpdate(dishId, {
      averageRating: Math.round(result[0].averageRating * 10) / 10,
      ratingCount: result[0].ratingCount,
    });
  } else {
    // No reviews left — reset to 0
    await Dish.findByIdAndUpdate(dishId, {
      averageRating: 0,
      ratingCount: 0,
    });
  }
}

// POST /api/reviews — Customer: create review
export async function createReview(req, res) {
  try {
    const { dishId, rating, comment } = req.body;

    if (!dishId || !rating) {
      return res.status(400).json({ message: "dishId and rating are required" });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ message: "Rating must be between 1 and 5" });
    }

    if (comment && comment.length > 220) {
      return res.status(400).json({ message: "Comment cannot exceed 220 characters" });
    }

    // Check dish exists
    const dish = await Dish.findById(dishId);
    if (!dish) {
      return res.status(404).json({ message: "Dish not found" });
    }

    // Check for existing review (one per customer per dish)
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

    // Recalculate dish rating after new review
    await refreshDishRating(dish._id);

    res.status(201).json({ message: "Review submitted", review });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: "You already reviewed this dish" });
    }
    console.error("Create review error:", error);
    res.status(500).json({ message: "Server error" });
  }
}

// GET /api/reviews/dish/:dishId — Public: get reviews for a dish
export async function getDishReviews(req, res) {
  try {
    const reviews = await Review.find({ dishId: req.params.dishId })
      .sort({ createdAt: -1 })
      .lean();

    res.json(reviews);
  } catch (error) {
    console.error("Get dish reviews error:", error);
    res.status(500).json({ message: "Server error" });
  }
}

// GET /api/reviews/my — Customer: get my reviews
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

// PATCH /api/reviews/:id — Customer: update my review
export async function updateReview(req, res) {
  try {
    const { rating, comment } = req.body;
    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({ message: "Review not found" });
    }

    // Only the review owner can update
    if (review.customerId.toString() !== req.user.id) {
      return res.status(403).json({ message: "You can only update your own reviews" });
    }

    if (rating !== undefined) {
      if (rating < 1 || rating > 5) {
        return res.status(400).json({ message: "Rating must be between 1 and 5" });
      }
      review.rating = rating;
    }
    if (comment !== undefined) {
      if (comment.length > 220) {
        return res.status(400).json({ message: "Comment cannot exceed 220 characters" });
      }
      review.comment = comment.trim();
    }

    await review.save();

    // Recalculate dish rating after update
    await refreshDishRating(review.dishId);

    res.json({ message: "Review updated", review });
  } catch (error) {
    console.error("Update review error:", error);
    res.status(500).json({ message: "Server error" });
  }
}

// DELETE /api/reviews/:id — Customer: delete my review
export async function deleteReview(req, res) {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) {
      return res.status(404).json({ message: "Review not found" });
    }

    if (review.customerId.toString() !== req.user.id) {
      return res.status(403).json({ message: "You can only delete your own reviews" });
    }

    const dishId = review.dishId;
    await review.deleteOne();

    // Recalculate dish rating after deletion
    await refreshDishRating(dishId);

    res.json({ message: "Review deleted" });
  } catch (error) {
    console.error("Delete review error:", error);
    res.status(500).json({ message: "Server error" });
  }
}

// GET /api/admin/reviews — Admin: list all reviews
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

// DELETE /api/admin/reviews/:id — Admin: delete any review
export async function adminDeleteReview(req, res) {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) {
      return res.status(404).json({ message: "Review not found" });
    }

    const dishId = review.dishId;
    await review.deleteOne();

    // Recalculate dish rating after admin deletion
    await refreshDishRating(dishId);

    res.json({ message: "Review deleted by admin" });
  } catch (error) {
    console.error("Admin delete review error:", error);
    res.status(500).json({ message: "Server error" });
  }
}
```

**Commit:**

```bash
git add controllers/reviewController.js
git commit -m "feat(reviews): add review controller with rating aggregation"
```

---

### Task 6.3: Create Review Routes

**Files:**
- Update: `crown-oven-backend/routes/reviewRoutes.js`

```js
// routes/reviewRoutes.js — Review routes
import { Router } from "express";
import requireAuth from "../middleware/requireAuth.js";
import requireAdmin from "../middleware/requireAdmin.js";
import {
  createReview,
  getDishReviews,
  getMyReviews,
  updateReview,
  deleteReview,
  listAllReviews,
  adminDeleteReview,
} from "../controllers/reviewController.js";

const router = Router();

// Public route
router.get("/dish/:dishId", getDishReviews);

// Customer routes
router.post("/", requireAuth, createReview);
router.get("/my", requireAuth, getMyReviews);
router.patch("/:id", requireAuth, updateReview);
router.delete("/:id", requireAuth, deleteReview);

// Admin routes
router.get("/admin/all", requireAuth, requireAdmin, listAllReviews);
router.delete("/admin/:id", requireAuth, requireAdmin, adminDeleteReview);

export default router;
```

**Commit:**

```bash
git add routes/reviewRoutes.js
git commit -m "feat(reviews): add review routes"
```

---

### Task 6.4: Create Review Service (Frontend)

**Files:**
- Create: `crown-oven-frontend/src/services/reviewService.js`

```js
// services/reviewService.js — API calls for reviews module
import API from "../constants/api";

// Customer: create review
export const createReview = (data) => API.post("/reviews", data);

// Public: get reviews for a dish
export const getDishReviews = (dishId) => API.get(`/reviews/dish/${dishId}`);

// Customer: get my reviews
export const getMyReviews = () => API.get("/reviews/my");

// Customer: update review
export const updateReview = (id, data) => API.patch(`/reviews/${id}`, data);

// Customer: delete review
export const deleteReview = (id) => API.delete(`/reviews/${id}`);

// Admin: list all reviews
export const listAllReviews = () => API.get("/reviews/admin/all");

// Admin: delete review
export const adminDeleteReview = (id) => API.delete(`/reviews/admin/${id}`);
```

**Commit:**

```bash
git add src/services/reviewService.js
git commit -m "feat(reviews): add review API service"
```

---

## Phase 7: Frontend Screens (All Members — Parallel)

> Each member implements their assigned screens. Below is the structure — full screen code will be generated during implementation.

### Task 7.1: Auth Screens (Member 1)
- `LoginScreen.js` — Email + password inputs, login button, link to register
- `RegisterScreen.js` — Full form with validation, register button
- `ProfileScreen.js` — View/edit profile, change password, upload avatar, logout
- `ManageUsersScreen.js` — FlatList of users with block/unblock/delete actions

### Task 7.2: Dish Screens (Member 2)
- `MenuScreen.js` — 2-column FlatList of DishCards, category filter, search
- `DishDetailScreen.js` — Full dish view with image, price, rating, reviews, add to order
- `ManageDishesScreen.js` — Admin CRUD list with add/edit/delete modal, image upload

### Task 7.3: Order Screens (Member 3)
- `CreateOrderScreen.js` — Order type toggle, item selection, table/address fields, place order
- `MyOrdersScreen.js` — FlatList of customer orders with status badges
- `OrderDetailScreen.js` — Full order view with items, total, status, pay/cancel buttons
- `ManageOrdersScreen.js` — Admin list with status filter, status update dropdown

### Task 7.4: Payment Screens (Member 4)
- `PaymentScreen.js` — Payment method selection (cash/bank), create payment
- `UploadProofScreen.js` — Image picker for bank slip, preview, submit
- `ManagePaymentsScreen.js` — Admin list with verify/reject buttons, proof image viewer, refund management

### Task 7.5: Table Screens (Member 5)
- `TablesScreen.js` — Table grid with availability by time slot, book button
- `ManageTablesScreen.js` — Admin CRUD with add/edit/delete

### Task 7.6: Review Screens (Member 6)
- `WriteReviewScreen.js` — Star rating picker, comment input, submit
- `DishReviewsScreen.js` — FlatList of reviews for a dish
- `ManageReviewsScreen.js` — Admin list with delete button

---

## Phase 8: Integration & Testing

### Task 8.1: Test All API Endpoints
Test each module's endpoints using Postman or curl:
1. Register customer → login → get token
2. Login as admin → manage dishes, tables, users
3. Customer: browse menu → create order → make payment → upload proof → write review
4. Admin: verify payment → update order status → review refund

### Task 8.2: Test Frontend-Backend Integration
1. Run backend: `cd crown-oven-backend && npm start`
2. Run frontend: `cd crown-oven-frontend && npx expo start`
3. Test complete flow on emulator/device

### Task 8.3: Create Admin Seed Script

**Files:**
- Create: `crown-oven-backend/seed.js`

```js
// seed.js — Create default admin user
import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import User from "./models/User.js";

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected to MongoDB");

  const adminEmail = "admin@crownoven.com";
  const existing = await User.findOne({ email: adminEmail });

  if (existing) {
    console.log("Admin already exists");
  } else {
    await User.create({
      firstName: "Admin",
      lastName: "Crown",
      email: adminEmail,
      password: await bcrypt.hash("Admin@1234", 10),
      role: "admin",
      phone: "0771234567",
    });
    console.log("Admin created: admin@crownoven.com / Admin@1234");
  }

  await mongoose.disconnect();
}

seed().catch(console.error);
```

Run: `node seed.js`

**Commit:**

```bash
git add seed.js
git commit -m "feat: add admin seed script"
```

---

## Summary — Who Builds What

| Phase | Member | Backend Files | Frontend Files |
|-------|--------|--------------|----------------|
| 0 | Team Lead | server.js, app.js, config/, middleware/, utils/ | App.js, navigation/, context/, constants/, components/common/ |
| 1 | Member 1 | models/User.js, controllers/authController.js, routes/authRoutes.js | services/authService.js, screens/auth/* |
| 2 | Member 2 | models/Dish.js, controllers/dishController.js, routes/dishRoutes.js | services/dishService.js, screens/dishes/* |
| 3 | Member 3 | models/Order.js, controllers/orderController.js, routes/orderRoutes.js | services/orderService.js, screens/orders/* |
| 4 | Member 4 | models/Payment.js, controllers/paymentController.js, routes/paymentRoutes.js | services/paymentService.js, screens/payments/* |
| 5 | Member 5 | models/DiningTable.js, controllers/tableController.js, routes/tableRoutes.js | services/tableService.js, screens/tables/* |
| 6 | Member 6 | models/Review.js, controllers/reviewController.js, routes/reviewRoutes.js | services/reviewService.js, screens/reviews/* |
| 7 | All | — | Each member builds their screens |
| 8 | All | seed.js, testing | Integration testing |
