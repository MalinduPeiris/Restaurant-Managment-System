# Premium Payment UI Design

## Goal
Redesign the customer payment method selection and proof upload screens in a more modern premium Crown Oven style without changing behavior, navigation, or API calls.

## Scope
- `crown-oven-frontend/src/screens/payments/PaymentScreen.js`
- `crown-oven-frontend/src/screens/payments/UploadProofScreen.js`

## Direction
Use an editorial light theme with ivory backgrounds, charcoal typography, gold and amber gradients, stronger visual hierarchy, and richer card treatments.

## Screen Decisions
- Payment method selection uses a hero summary card, premium method tiles, and a contextual guidance panel.
- Proof upload uses a step-based layout, framed preview container, enhanced empty state, and a receipt quality checklist.
- Existing create-payment and upload-proof flows remain unchanged.

## Constraints
- Keep current route params and API usage.
- Keep `cash` and `bank_transfer` behavior identical to the existing implementation.
- Preserve mobile-first layout and existing token palette.
