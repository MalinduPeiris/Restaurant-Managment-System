# Service Feedback — Design

**Date:** 2026-03-28
**Status:** Approved

## Overview

Add Service Feedback to the existing Review Management function. Customers rate their order experience (not dishes) after delivery/collection. Admin views and replies.

## Model: Feedback

| Field | Type | Notes |
|-------|------|-------|
| orderId | ObjectId → Order | unique, one feedback per order |
| customerId | ObjectId → User | required |
| customerName | String | required |
| rating | Number | 1-5 integer |
| comment | String | max 300 chars |
| adminReply | String | max 300 chars, null until admin replies |
| timestamps | auto | createdAt, updatedAt |

## API Endpoints

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| POST | `/api/feedback` | Customer | Submit feedback |
| GET | `/api/feedback/my` | Customer | My feedback history |
| GET | `/api/feedback/order/:orderId` | Customer | Check if feedback exists |
| GET | `/api/feedback/admin/all` | Admin | List all feedback |
| PATCH | `/api/feedback/admin/:id/reply` | Admin | Reply to feedback |
| DELETE | `/api/feedback/admin/:id` | Admin | Delete feedback |

## Backend Logic

- Only Delivered/Collected orders can receive feedback
- One feedback per order (unique orderId)
- Customer can only feedback their own orders
- Rating 1-5 integer, comment max 300 chars
- Only admin can reply, reply max 300 chars

## Frontend Changes

- OrderDetailScreen: "Rate Experience" button for delivered/collected orders
- WriteFeedbackScreen (new): star rating + comment
- ManageReviewsScreen: add tab for "Service Feedback" with reply

## Flow

```
Order Delivered/Collected
→ "Rate Experience" button on OrderDetailScreen
→ Customer submits rating + comment
→ Admin sees in Reviews → Feedback tab
→ Admin replies
→ Customer sees reply
```
