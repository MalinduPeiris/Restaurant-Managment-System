# Delivery Management Module — Design

**Date:** 2026-03-28
**Status:** Approved

## Overview

Simple delivery management module for Crown Oven. After an order reaches "Ready" status, a delivery record is auto-created. Admin assigns riders, riders update delivery status, customers see progress.

## Key Decisions

- Auto-create delivery when order status hits `Ready` (delivery orders only)
- Admin creates rider accounts (no self-registration)
- Customer sees delivery status + rider info on OrderDetailScreen
- Rider gets dedicated navigation layout (Bottom Tabs: Deliveries, Profile)
- Order status flow unchanged — delivery module runs in parallel, auto-syncs on completion

## Data Model

### Delivery (new model)

| Field | Type | Notes |
|-------|------|-------|
| orderId | ObjectId → Order | unique, one delivery per order |
| riderId | ObjectId → User | nullable until assigned |
| status | enum | PENDING, ASSIGNED, ON_THE_WAY, DELIVERED |
| deliveryAddress | String | copied from order at creation |
| customerName | String | copied from order |
| customerPhone | String | copied from order |
| assignedAt | Date | when admin assigns rider |
| pickedUpAt | Date | when rider starts delivery |
| deliveredAt | Date | when rider completes |
| timestamps | auto | createdAt, updatedAt |

### User model update

Add `"rider"` to role enum: `["customer", "admin", "rider"]`

## Status Transitions (backend-enforced)

```
PENDING → ASSIGNED      (admin assigns rider)
ASSIGNED → ON_THE_WAY   (rider picks up food)
ON_THE_WAY → DELIVERED   (rider completes delivery)
```

## Auto-triggers

1. Order status → `Ready` (delivery order) → auto-create Delivery with status `PENDING`
2. Delivery status → `DELIVERED` → auto-update Order status to `Delivered`

## API Endpoints

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| GET | `/api/deliveries/admin/all` | Admin | List all deliveries |
| PATCH | `/api/deliveries/admin/:id/assign` | Admin | Assign rider to delivery |
| POST | `/api/auth/admin/create-rider` | Admin | Create rider account |
| GET | `/api/users/admin/riders` | Admin | List all riders |
| GET | `/api/deliveries/rider/my` | Rider | My assigned deliveries |
| PATCH | `/api/deliveries/rider/:id/status` | Rider | Update to ON_THE_WAY or DELIVERED |
| GET | `/api/deliveries/order/:orderId` | Customer | View delivery status for their order |

## Screens

| Screen | Role | Purpose |
|--------|------|---------|
| ManageDeliveriesScreen | Admin | List deliveries, assign riders via dropdown |
| ManageRidersScreen | Admin | Create/view/block rider accounts |
| RiderDeliveriesScreen | Rider | View assigned deliveries, update status buttons |
| RiderProfileScreen | Rider | View own profile |
| OrderDetailScreen (updated) | Customer | Shows delivery status + rider name/phone |

## Navigation

- **Rider**: Bottom Tabs → Deliveries | Profile
- **Admin Drawer**: Add "Deliveries" and "Riders" menu items
- **AppNavigator**: Add rider role check → render RiderTabs

## System Flow

```
Customer places delivery order
        ↓
Order: Pending → Preparing → Ready
        ↓ (auto-trigger)
Delivery created: PENDING
        ↓
Admin assigns rider → ASSIGNED
        ↓
Rider picks up → ON_THE_WAY
        ↓
Rider completes → DELIVERED
        ↓ (auto-trigger)
Order status → Delivered
        ↓
Customer sees: "Delivered by [Rider Name]"
```
