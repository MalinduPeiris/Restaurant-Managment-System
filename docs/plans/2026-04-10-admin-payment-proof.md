# Admin Payment Proof Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Show a short order ID on admin payment cards and let admins open uploaded proof images in a full-screen modal.

**Architecture:** Reuse the populated `orderId.orderNumber` already returned by the backend payment list and format it with the shared frontend utility. Extend the existing payment list item UI with a proof-image overlay action and a modal viewer managed by local screen state.

**Tech Stack:** Expo React Native, React hooks, React Native `Modal`, `@expo/vector-icons`

---

### Task 1: Extend the admin payment card metadata

**Files:**
- Modify: `crown-oven-frontend/src/screens/payments/ManagePaymentsScreen.js`

**Step 1: Read the existing payment card layout**

Confirm where `paymentId`, amount, status, proof image, and actions are rendered so the new order reference fits without disturbing review actions.

**Step 2: Add short order number formatting**

Import the shared `formatOrderNumber()` helper and render an `Order ID` row using `item.orderId?.orderNumber`.

**Step 3: Keep the card readable**

Add compact supporting styles for the new metadata row so it stays scannable on mobile.

### Task 2: Add full proof image viewing

**Files:**
- Modify: `crown-oven-frontend/src/screens/payments/ManagePaymentsScreen.js`

**Step 1: Add viewer state**

Track the currently selected proof image URL in local state.

**Step 2: Add an eye overlay action**

Wrap the proof thumbnail in a container and add an eye icon button that opens the modal.

**Step 3: Add the modal viewer**

Render a full-screen modal with the proof image, dark backdrop, and close button.

### Task 3: Verify behavior manually

**Files:**
- Modify: `crown-oven-frontend/src/screens/payments/ManagePaymentsScreen.js`

**Step 1: Review loaded admin payments**

Check that cards with populated `orderId.orderNumber` show `ORD-####`.

**Step 2: Review proof image flow**

Check that tapping the eye button opens the full proof image and closing returns to the payment list.

**Step 3: Confirm review actions still work**

Verify that `Verify` and `Reject` buttons remain reachable and unchanged.
