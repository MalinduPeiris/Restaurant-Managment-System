# Cancelled Order Delete Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Let admins permanently delete only cancelled orders from order management.

**Architecture:** Add an admin-only backend delete endpoint that blocks non-cancelled orders and removes the related order, payment, and delivery records together. Expose that endpoint through the frontend order service and add a delete action only on cancelled cards in the admin order dashboard.

**Tech Stack:** Express, Mongoose, Expo React Native, Axios

---

### Task 1: Add guarded admin delete support in the backend

**Files:**
- Modify: `crown-oven-backend/controllers/orderController.js`
- Modify: `crown-oven-backend/routes/orderRoutes.js`

**Step 1: Add controller logic**

Create an admin delete handler that validates the order id, loads the order, and rejects deletion unless the status is `Cancelled`.

**Step 2: Remove related records safely**

Delete matching delivery and payment records before deleting the cancelled order.

**Step 3: Add route**

Register an admin-only `DELETE` route under `/orders/admin/:id`.

### Task 2: Expose delete in the frontend order service

**Files:**
- Modify: `crown-oven-frontend/src/services/orderService.js`

**Step 1: Add service call**

Add a `deleteOrder` function that calls the new admin delete endpoint.

### Task 3: Add the admin delete action in order management

**Files:**
- Modify: `crown-oven-frontend/src/screens/orders/ManageOrdersScreen.js`

**Step 1: Add delete handler**

Show a confirmation alert and call the new delete API.

**Step 2: Restrict UI to cancelled orders**

Render the delete button only when `item.status === "Cancelled"`.

**Step 3: Keep existing controls intact**

Do not change the current status progression or payment warning logic.
