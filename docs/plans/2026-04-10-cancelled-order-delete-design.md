# Cancelled Order Delete Design

## Goal
Allow admins to permanently remove orders only after they are already cancelled, keeping normal order history intact while still providing a safe cleanup path in order management.

## Approved Approach
- Keep existing order cancellation behaviour unchanged.
- Add an admin-only delete endpoint for orders.
- Allow deletion only when the order status is `Cancelled`.
- Remove related payment and delivery records together with the cancelled order.
- Show the delete action only on cancelled order cards in admin order management.

## Scope
- Backend: order route and controller
- Frontend: admin order service and admin order management screen

## Success Criteria
- Admin cannot delete active, preparing, ready, delivered, or collected orders.
- Admin can permanently delete cancelled orders from the admin order list.
- Deleting a cancelled order also removes linked payment and delivery records.
