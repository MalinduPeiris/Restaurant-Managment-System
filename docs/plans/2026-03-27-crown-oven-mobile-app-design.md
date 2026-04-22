# Crown Oven — Mobile App Design Document

**Date:** 2026-03-27
**Project:** Food Ordering and Restaurant Management Mobile App
**Team Size:** 6 members
**Type:** University Assignment

---

## 1. System Architecture

```
React Native (Expo)  ←→  Node.js/Express API  ←→  MongoDB Atlas
                              ↕
                          Cloudinary (images)
                          JWT (authentication)
```

- **Frontend:** React Native with Expo
- **Backend:** Node.js + Express.js (ES modules)
- **Database:** MongoDB Atlas with Mongoose ODM
- **Auth:** JWT (bcrypt for password hashing)
- **Images:** Cloudinary (dish images + payment proof uploads)
- **Roles:** 2 only — `customer` and `admin`

---

## 2. Database Schema

### User (Member 1)
| Field | Type | Details |
|-------|------|---------|
| firstName | String | required |
| lastName | String | required |
| email | String | required, unique, lowercase |
| password | String | required, bcrypt hashed |
| role | String | "customer" / "admin", default: "customer" |
| phone | String | 10 digits |
| address | String | default delivery address |
| image | String | Cloudinary URL |
| isBlocked | Boolean | default: false |

### Dish (Member 2)
| Field | Type | Details |
|-------|------|---------|
| name | String | required, unique |
| category | String | e.g. "Rice", "Beverages" |
| description | String | |
| price | Number | required, min: 0 |
| imageUrl | String | Cloudinary URL |
| isAvailable | Boolean | default: true |
| averageRating | Number | 0-5, backend calculated |
| ratingCount | Number | backend calculated |

### Order (Member 3)
| Field | Type | Details |
|-------|------|---------|
| orderNumber | String | unique, "ORD-{timestamp}" |
| customerId | ObjectId | ref: User |
| orderType | String | "dine-in" / "takeaway" / "delivery" |
| items | Array | embedded: { dishId, name, price, quantity } |
| totalAmount | Number | backend calculated |
| status | String | Pending → Preparing → Ready → Served/Delivered/Collected/Cancelled |
| tableId | ObjectId | ref: DiningTable (if dine-in) |
| timeSlot | String | e.g. "12:00-13:00" (if dine-in) |
| seatCount | Number | (if dine-in) |
| deliveryAddress | String | (if delivery) |
| customerName | String | |
| phone | String | |
| paymentStatus | String | "unpaid" / "paid" |

### Payment (Member 4)
| Field | Type | Details |
|-------|------|---------|
| paymentId | String | unique, "PAY-{timestamp}" |
| orderId | ObjectId | ref: Order, unique |
| customerId | ObjectId | ref: User |
| amount | Number | must match order totalAmount |
| paymentMethod | String | "cash" / "bank_transfer" |
| proofImageUrl | String | Cloudinary URL (bank transfer) |
| status | String | pending → submitted → verified / rejected |
| refundStatus | String | none / requested / approved / rejected |
| refundRequestedAt | Date | |
| refundReviewedBy | ObjectId | ref: User (admin) |
| paidBy | ObjectId | ref: User |

### DiningTable (Member 5)
| Field | Type | Details |
|-------|------|---------|
| tableNo | String | required, unique |
| seats | Number | 2 or 4 |
| location | String | "indoor" / "outdoor" |
| isAvailable | Boolean | default: true |

### Review (Member 6)
| Field | Type | Details |
|-------|------|---------|
| dishId | ObjectId | ref: Dish |
| customerId | ObjectId | ref: User |
| customerName | String | |
| rating | Number | 1-5 |
| comment | String | max 220 chars |
| Unique index | dishId + customerId | one review per dish per user |

---

## 3. API Endpoints (35 total)

### Auth (Member 1)
- POST /api/auth/register
- POST /api/auth/login
- GET /api/auth/profile
- PATCH /api/auth/profile
- POST /api/auth/change-password
- POST /api/auth/upload-avatar
- GET /api/admin/users
- PATCH /api/admin/users/:id
- DELETE /api/admin/users/:id

### Dishes (Member 2)
- GET /api/dishes
- GET /api/dishes/:id
- POST /api/admin/dishes
- PATCH /api/admin/dishes/:id
- DELETE /api/admin/dishes/:id

### Orders (Member 3)
- POST /api/orders
- GET /api/orders/my
- GET /api/orders/:id
- PATCH /api/orders/:id/cancel
- GET /api/admin/orders
- PATCH /api/admin/orders/:id/status

### Payments (Member 4)
- POST /api/payments
- POST /api/payments/:id/upload-proof
- GET /api/payments/order/:orderId
- POST /api/payments/:id/refund
- GET /api/admin/payments
- PATCH /api/admin/payments/:id/verify
- PATCH /api/admin/payments/:id/refund-review

### Tables (Member 5)
- GET /api/tables
- GET /api/tables/available
- POST /api/admin/tables
- PATCH /api/admin/tables/:id
- DELETE /api/admin/tables/:id

### Reviews (Member 6)
- POST /api/reviews
- GET /api/reviews/dish/:dishId
- GET /api/reviews/my
- PATCH /api/reviews/:id
- DELETE /api/reviews/:id
- GET /api/admin/reviews
- DELETE /api/admin/reviews/:id

---

## 4. Backend Business Logic

### Order Total (backend only)
```
totalAmount = SUM(dish.price × item.quantity)
Prices fetched from DB, never trusted from frontend
```

### Rating Aggregation (backend only)
```
averageRating = AVG(all ratings for dish)
ratingCount = COUNT(all reviews for dish)
Recalculated on every review create/update/delete
```

### Payment Validation (backend only)
```
payment.amount MUST === order.totalAmount
Prevent duplicate: one payment per order
Bank transfer: require proof image upload
```

### Table Availability (backend only)
```
availableSeats = table.seats - SUM(booked seats for timeSlot)
Only count active orders (not Cancelled)
```

### Order Type Validation (backend only)
```
dine-in  → tableId + timeSlot + seatCount required
delivery → deliveryAddress required
takeaway → no extra fields
```

---

## 5. Payment Flow

| Method | Customer Action | Admin Action |
|--------|----------------|--------------|
| Cash | Selects cash | Marks as verified when received |
| Bank Transfer | Transfers money → uploads proof image | Views proof → verifies/rejects |

Status: pending → submitted (proof uploaded) → verified / rejected

### Refund Flow
Customer requests → admin approves/rejects
Only for verified payments

---

## 6. Frontend Structure (React Native / Expo)

### Navigation
- Customer: Bottom Tab Navigation (Home, Orders, Tables, Reviews, Profile)
- Admin: Drawer Navigation (Dashboard, Dishes, Orders, Payments, Tables, Reviews, Users, Profile)

### Screens Per Member
| Member | Screens |
|--------|---------|
| 1 Auth | Login, Register, Profile |
| 2 Dishes | Menu, DishDetail, ManageDishes |
| 3 Orders | CreateOrder, MyOrders, OrderDetail, ManageOrders |
| 4 Payments | Payment, UploadProof, ManagePayments |
| 5 Tables | Tables, ManageTables |
| 6 Reviews | WriteReview, DishReviews, ManageReviews |

---

## 7. Crown Oven Brand Design

### Colors
| Name | HEX | Usage |
|------|-----|-------|
| Royal Gold | #D4A843 | Primary buttons, highlights, active tabs |
| Crown Black | #1A1A1A | Headers, primary text, admin drawer |
| Flame Orange | #E8732A | Badges, notifications, pending status |
| Charcoal | #2D2D2D | Secondary text, dark cards |
| Ivory White | #FAF8F5 | Screen backgrounds |
| Ash Gray | #9E9E9E | Placeholders, disabled, borders |
| Success Green | #2E7D32 | Available, verified, served |
| Error Red | #C62828 | Cancelled, rejected, errors |

### Typography
- Brand title: Playfair Display Bold 28px
- Headings: Poppins SemiBold 22px
- Body: Poppins Regular 14px
- Buttons: Poppins SemiBold 16px

### Tagline
"Reign of Flavor"

---

## 8. Team Assignment

| Member | Module | Backend | Frontend |
|--------|--------|---------|----------|
| 1 | Authentication | authController + User model | Login, Register, Profile screens |
| 2 | Dishes/Catalog | dishController + Dish model | Menu, DishDetail, ManageDishes screens |
| 3 | Orders | orderController + Order model | CreateOrder, MyOrders, ManageOrders screens |
| 4 | Payments | paymentController + Payment model | Payment, UploadProof, ManagePayments screens |
| 5 | Tables | tableController + DiningTable model | Tables, ManageTables screens |
| 6 | Reviews | reviewController + Review model | WriteReview, DishReviews, ManageReviews screens |

### Shared (Team Lead sets up)
- Express app setup (app.js, server.js)
- MongoDB connection, Cloudinary config
- Auth middleware (auth.js, requireAuth.js, requireAdmin.js)
- React Native project init (Expo)
- Navigation (AppNavigator, CustomerTabs, AdminDrawer)
- AuthContext, theme constants, common components
