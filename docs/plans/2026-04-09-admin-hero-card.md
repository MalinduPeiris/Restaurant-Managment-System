# Admin Hero Card Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a reusable hero card to the admin screens and replace the current plain top headers.

**Architecture:** Introduce one common `AdminHeroCard` component built with the existing Expo/React Native stack, then render it inside each admin screen's existing layout. Screens keep their own content and actions; only the top presentation layer is standardized.

**Tech Stack:** React Native, Expo, `expo-linear-gradient`, React Navigation

---

### Task 1: Shared hero component

**Files:**
- Create: `crown-oven-frontend/src/components/common/AdminHeroCard.js`

**Step 1: Write the component**

- Build a reusable card with props for icon, badge, title, subtitle, gradient colors, and optional action button.

**Step 2: Match existing style**

- Reuse the premium rounded layout already used in table management.

### Task 2: Apply to admin screens

**Files:**
- Modify: `crown-oven-frontend/src/screens/admin/AdminDashboardScreen.js`
- Modify: `crown-oven-frontend/src/screens/orders/ManageOrdersScreen.js`
- Modify: `crown-oven-frontend/src/screens/dishes/ManageDishesScreen.js`
- Modify: `crown-oven-frontend/src/screens/payments/ManagePaymentsScreen.js`
- Modify: `crown-oven-frontend/src/screens/tables/ManageTablesScreen.js`
- Modify: `crown-oven-frontend/src/screens/reviews/ManageReviewsScreen.js`
- Modify: `crown-oven-frontend/src/screens/reservations/ManageReservationsScreen.js`
- Modify: `crown-oven-frontend/src/screens/deliveries/ManageDeliveriesScreen.js`
- Modify: `crown-oven-frontend/src/screens/deliveries/ManageRidersScreen.js`
- Modify: `crown-oven-frontend/src/screens/rooms/ManageRoomsScreen.js`
- Modify: `crown-oven-frontend/src/screens/rooms/ManageRoomBookingsScreen.js`
- Modify: `crown-oven-frontend/src/screens/auth/ManageUsersScreen.js`

**Step 1: Insert hero card**

- Replace plain screen titles with `AdminHeroCard`.

**Step 2: Preserve behaviors**

- Keep existing refresh, search, tabs, and filters working as they do now.

**Step 3: Adjust spacing**

- Ensure top spacing and list padding still look balanced on mobile.

### Task 3: Verify

**Files:**
- No new files

**Step 1: Review screens for layout consistency**

- Check that each screen has the shared header and that no content overlaps or loses padding.
