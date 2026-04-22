# Customer Order Delivery Status Design

## Goal
Show clearer customer-facing delivery progress without changing backend order or delivery state machines.

## Decision
Keep admin order statuses and rider delivery statuses unchanged.
Map display labels only on the customer side.

## Mapping
- `Ready` + no rider assigned or delivery `PENDING` -> `Waiting for delivery`
- delivery `ASSIGNED` -> `Assigned`
- delivery `ON_THE_WAY` -> `On the Way`
- delivery `DELIVERED` or order `Delivered` -> `Delivered`
- pickup orders and non-delivery states keep existing labels

## Implementation
- Add a small frontend helper to derive customer-facing order labels and badge colors.
- Update `MyOrdersScreen` to fetch delivery records for delivery orders that have reached `Ready` or `Delivered`.
- Update `OrderDetailScreen` to reuse the same helper for the main status badge.
- Leave admin order management and delivery management unchanged.

## Risk Notes
This approach adds extra delivery lookups on the customer order list. It avoids schema changes and keeps the current backend transition rules intact.
