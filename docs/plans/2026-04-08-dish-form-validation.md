# Dish Form Validation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Restrict the admin dish form so price accepts numeric input only and dish names cannot include digits.

**Architecture:** Keep the change local to the admin dish management screen. Sanitize user input at the field level and add submit-time validation so pasted invalid values are rejected before the API call.

**Tech Stack:** Expo React Native, JavaScript, existing `Input` component

---

### Task 1: Patch dish form input handling

**Files:**
- Modify: `crown-oven-frontend/src/screens/dishes/ManageDishesScreen.js`

**Step 1: Add small sanitizing helpers**

Create local helpers for:
- removing digits from dish names
- keeping price values numeric with a single decimal point

**Step 2: Use helpers in the form inputs**

Update:
- `Name` input `onChangeText`
- `Price (Rs.)` input `onChangeText`

**Step 3: Add submit-time validation**

Before sending the request:
- reject empty or digit-containing names
- reject empty or non-numeric prices

**Step 4: Review manually**

Verify:
- typing letters into price does nothing
- typing digits into name removes them
- valid dish names with spaces still work
- valid decimal prices still work
