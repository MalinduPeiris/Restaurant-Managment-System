# Same-Day Table Reservation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Allow same-day table reservations only when the selected time is later than the current local time, while preserving operating-hour and future-date rules.

**Architecture:** The backend remains the source of truth for date and time validity. The frontend time picker narrows available choices for today so users cannot easily select invalid past slots.

**Tech Stack:** Express, Mongoose, Expo React Native, JavaScript

---

### Task 1: Update backend reservation validation

**Files:**
- Modify: `crown-oven-backend/controllers/reservationController.js`

**Step 1: Replace UTC date normalization**
- Parse `YYYY-MM-DD` into a local date at midnight so the reservation day does not shift across timezones.

**Step 2: Add same-day time validation**
- Reject same-day time slots that are not strictly later than the current local time.
- Reuse the same validation in both reservation creation and table-availability lookup.

**Step 3: Preserve current business-hour rules**
- Keep the `8:30 AM` to `11:30 PM` limit unchanged.

### Task 2: Update frontend time selection

**Files:**
- Modify: `crown-oven-frontend/src/components/common/TimePicker.js`
- Modify: `crown-oven-frontend/src/screens/reservations/MakeReservationScreen.js`

**Step 1: Add a minimum allowed time input to the time picker**
- Disable hours and minutes earlier than the current local time when the selected date is today.

**Step 2: Clear invalid selected times**
- If the user changes to today and the chosen time is now invalid, clear or snap the selection to a valid future slot.

**Step 3: Show the same business-hour range**
- Keep the existing open-hours display unchanged.

### Task 3: Verify behavior manually

**Files:**
- Review: `crown-oven-backend/controllers/reservationController.js`
- Review: `crown-oven-frontend/src/components/common/TimePicker.js`
- Review: `crown-oven-frontend/src/screens/reservations/MakeReservationScreen.js`

**Step 1: Confirm today accepts a later time**
- Example: if now is `6:14 PM`, `6:15 PM` or later should be allowed.

**Step 2: Confirm today rejects past or equal times**
- Example: `6:10 PM` and `6:14 PM` should be blocked.

**Step 3: Confirm tomorrow still works**
- Tomorrow should not be rejected as a past date.
