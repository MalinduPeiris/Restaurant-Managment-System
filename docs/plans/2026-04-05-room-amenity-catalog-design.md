# Room Amenity Catalog Design

## Goal
Replace hardcoded room amenity strings and prices with an admin-managed catalog so room bookings calculate totals from backend-controlled amenity pricing.

## Backend
- Add an `Amenity` model with `name`, `price`, `isChargeable`, and `isActive`.
- Expose `/api/amenities` for listing, creating, and updating amenities.
- Store room amenities as `Amenity` references instead of string enums.
- Store booking amenities as price snapshots so later price changes do not alter old bookings.
- Calculate `baseAmount`, `amenityAmount`, and `totalAmount` in the booking controller.

## Frontend
- Load amenity objects instead of hardcoded room amenity constants.
- Let admin manage amenities inside the existing room management screen.
- Let admin assign active amenities to rooms from the room form.
- Show dynamic amenity names, icons, and prices on room list, room detail, and booking screens.
- Show booking amenity snapshots in admin booking management.

## Notes
- Price authority stays in the backend.
- Empty amenity selections must still save correctly when editing rooms.
- Default amenities are added to `seed.js` for fresh project setup.
