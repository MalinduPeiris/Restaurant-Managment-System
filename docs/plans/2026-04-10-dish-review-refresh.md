# Dish Review Refresh Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Refresh menu and dish detail ratings immediately after a user submits a dish review.

**Architecture:** Replace mount-only dish loading with focus-based refetching on the affected customer screens. This keeps the review submission flow simple while ensuring both screens pull the latest rating data when the user navigates back.

**Tech Stack:** Expo React Native, React hooks, React Navigation focus lifecycle, Axios

---

### Task 1: Refresh the menu on focus

**Files:**
- Modify: `crown-oven-frontend/src/screens/dishes/MenuScreen.js`

**Step 1: Reuse the existing fetch function**

Keep the current menu fetch logic, but make it callable from a focus lifecycle hook.

**Step 2: Refetch when the menu regains focus**

Use navigation focus handling so returning from `WriteReview` reloads the dish list.

**Step 3: Preserve search and category behavior**

Keep the current search/category filtering and pull-to-refresh flow intact.

### Task 2: Refresh dish detail on focus

**Files:**
- Modify: `crown-oven-frontend/src/screens/dishes/DishDetailScreen.js`

**Step 1: Extract the detail fetch logic**

Wrap dish loading and review eligibility checks in a reusable callback.

**Step 2: Refetch when dish detail regains focus**

Use navigation focus handling so returning from `WriteReview` reloads the dish rating and review state.

**Step 3: Keep current review eligibility logic**

Do not change completed-order or already-reviewed validation.

### Task 3: Manual verification

**Files:**
- Modify: `crown-oven-frontend/src/screens/dishes/MenuScreen.js`
- Modify: `crown-oven-frontend/src/screens/dishes/DishDetailScreen.js`

**Step 1: Submit a review**

Open a dish, write a review, and submit it.

**Step 2: Verify detail refresh**

Confirm the dish detail screen shows the updated average and review count immediately after returning.

**Step 3: Verify menu refresh**

Return to the menu and confirm the updated rating is visible without manual pull-to-refresh.
