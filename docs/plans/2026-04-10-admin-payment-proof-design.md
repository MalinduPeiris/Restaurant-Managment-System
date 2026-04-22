# Admin Payment Proof Design

## Goal
Make payment review clearer for admins by showing the related short order ID on each payment card and allowing the uploaded bank deposit proof to open in a full-screen viewer.

## Approved Approach
- Reuse the existing populated `orderId.orderNumber` value from the payment list response.
- Format the order reference with the existing `formatOrderNumber()` utility so admins see `ORD-####`.
- Keep the proof thumbnail in the payment card and add an eye button overlay.
- Open the proof image in a full-screen modal inside the same screen for faster review.

## Scope
- Frontend only: `crown-oven-frontend/src/screens/payments/ManagePaymentsScreen.js`
- No new backend field is required because `listAllPayments()` already populates `orderId.orderNumber`.

## Success Criteria
- Admin can identify which order a payment belongs to without leaving the payment list.
- Admin can open the full deposit proof image from the payment card and inspect it clearly.
- Existing verify and reject flows continue to work unchanged.
