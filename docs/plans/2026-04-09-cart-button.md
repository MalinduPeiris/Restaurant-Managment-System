# Cart Button Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Update the user-facing `Add to Cart` buttons to a darker green style on both main customer dish views.

**Architecture:** Keep the existing button structure and cart behavior intact, and change only the visual styling tokens in the two customer-facing dish screens. The button should read as one shared action across menu cards and the dish detail CTA.

**Tech Stack:** React Native, Expo, existing app style constants

---

### Task 1: Dish Detail CTA

**Files:**
- Modify: `crown-oven-frontend/src/screens/dishes/DishDetailScreen.js`
- Modify: `crown-oven-frontend/src/components/common/Button.js`

**Step 1: Update primary cart CTA styling**

- Give the button a dark green gradient and keep white text.

### Task 2: Menu Card CTA

**Files:**
- Modify: `crown-oven-frontend/src/screens/dishes/MenuScreen.js`

**Step 1: Update mini add-to-cart button styling**

- Match the same green family while preserving the compact card layout.

### Task 3: Verify

**Files:**
- No new files

**Step 1: Check consistency**

- Confirm both customer cart buttons feel visually related after reload.
