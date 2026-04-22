# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Crown Oven** — a full-stack mobile restaurant management app built with React Native (Expo) frontend and Node.js/Express backend. Uses MongoDB Atlas with Mongoose ODM. Two roles: admin and customer.

## Commands

### Backend
```bash
cd crown-oven-backend
npm install --legacy-peer-deps
npm start          # runs: nodemon server.js (port 3000)
npm run seed       # seeds admin user, sample dishes, and tables
```

### Frontend
```bash
cd crown-oven-frontend
npm install --legacy-peer-deps
npx expo start     # Expo dev server
```

## Architecture

**Backend** (`crown-oven-backend/`): Express app using ES modules (`"type": "module"`). Entry point `server.js` connects to MongoDB then starts Express. `app.js` sets up CORS, rate limiting, auth middleware, and mounts all 6 route modules under `/api` prefix.

**Routing pattern**: `routes/` files define Express routers, each importing controller functions from `controllers/` and applying middleware. Routes are mounted under `/api` — e.g., `/api/orders`, `/api/auth`, `/api/dishes`, `/api/payments`, `/api/tables`, `/api/reviews`.

**Authentication**: JWT-based. `middleware/auth.js` decodes the token and attaches `req.user` (non-blocking). `requireAuth.js` blocks unauthenticated/blocked users. `requireAdmin.js` restricts to admin role.

**User roles**: `customer`, `admin` (simplified from original 4-role system).

**Key models** (all in `models/`):
- `User` — authentication, profile, role (customer/admin), blocking
- `Order` — supports `dine-in`, `takeaway`, `delivery` order types with embedded items array, backend-calculated totalAmount
- `Dish` — menu items with availability, aggregated ratings (averageRating, ratingCount)
- `DiningTable` — table/seat management (2 or 4 seats, indoor/outdoor)
- `Payment` — linked to orders, supports cash/bank_transfer with proof upload and refund workflow
- `Review` — customer reviews (one per customer per dish, max 220 char comment)

**Frontend** (`crown-oven-frontend/`): React Native (Expo ~52.0.0) mobile app. 19 screens across 6 modules (auth, dishes, orders, payments, tables, reviews). Uses React Navigation 7 (Bottom Tabs for customer, Drawer for admin, Native Stack for auth). Axios with JWT interceptor for API calls. AuthContext for global auth state with AsyncStorage persistence.

**Navigation**:
- Customer: Bottom Tabs (Menu, Orders, Tables, Profile) + stack screens (DishDetail, CreateOrder, OrderDetail, Payment, UploadProof, WriteReview, DishReviews)
- Admin: Drawer (Orders, Dishes, Payments, Tables, Reviews, Users, Profile) + stack screens (DishDetail, OrderDetail)

**Design System**: Crown Oven brand — Royal Gold #D4A843, Crown Black #1A1A1A, Flame Orange #E8732A. Fonts: Poppins (body) + Playfair Display (titles). Shared constants in `src/constants/` and reusable components in `src/components/common/`.

## Important Details

- MongoDB connection string and JWT secret are in `crown-oven-backend/.env`
- Cloudinary config for image uploads (dishes, payment proofs, avatars) also in `.env`
- Backend calculates order totals from DB prices (never trust frontend amounts)
- Payment proof upload uses expo-image-picker + multer-storage-cloudinary
- No test suite configured
- Use `--legacy-peer-deps` for npm install (cloudinary v2 peer dep conflict)
