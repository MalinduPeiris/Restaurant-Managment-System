# Login Portal Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Redesign the customer, admin, and rider login screens into one unified premium Crown Oven login system with small role accents.

**Architecture:** Introduce a shared auth portal shell component for the visual structure, then refactor each login screen to use that shell while preserving its current login logic, navigation targets, and role-specific messaging. Keep form behavior and API calls unchanged.

**Tech Stack:** React Native, Expo, existing shared `Input`, `Button`, `Logo`, and `Ionicons`

---

### Task 1: Build Shared Auth Portal Shell

**Files:**
- Create: `crown-oven-frontend/src/components/common/AuthPortalShell.js`

**Step 1:** Create a reusable screen shell with an optional back link, ambient background shapes, logo section, role badge, shared content card, and footer slots.

**Step 2:** Keep props limited to the fields needed by the three login screens.

**Step 3:** Verify the shell supports customer, admin, and rider accent colors without changing behavior.

### Task 2: Refactor Customer Login

**Files:**
- Modify: `crown-oven-frontend/src/screens/auth/LoginScreen.js`

**Step 1:** Replace the old standalone layout with the shared shell.

**Step 2:** Keep the current customer login logic, validation, register link, and portal navigation.

**Step 3:** Upgrade the lower portal section to feel more intentional and premium.

### Task 3: Refactor Admin and Rider Login

**Files:**
- Modify: `crown-oven-frontend/src/screens/auth/AdminLoginScreen.js`
- Modify: `crown-oven-frontend/src/screens/auth/RiderLoginScreen.js`

**Step 1:** Move both screens to the shared shell.

**Step 2:** Keep role-specific expected login role checks and back navigation.

**Step 3:** Use small visual accents only for each role instead of completely separate visual systems.

### Task 4: Verify Behavior

**Files:**
- Review only

**Step 1:** Check password toggle placement on all three screens.

**Step 2:** Check loading and error states remain visible.

**Step 3:** Confirm no route names or login service calls changed.
