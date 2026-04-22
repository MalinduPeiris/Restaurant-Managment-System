# Same-Day Table Reservation Design

**Goal:** Allow customers to reserve tables for the current day when the selected slot is still in the future and within business hours.

## Approved Behavior
- Reservations remain limited to the restaurant window of `8:30 AM` through `11:30 PM`.
- Future dates remain allowed up to 2 months ahead.
- The current day is also allowed.
- For the current day, the selected time must be strictly later than the current local server time.
- If the selected slot is in the past or exactly equal to the current time, the request is rejected with a clear validation message.

## Backend Design
- Replace the current UTC-based date normalization with local date parsing for `YYYY-MM-DD` inputs so selected dates do not shift backward.
- Add a same-day time validator used by both `createReservation` and `getAvailableTablesForReservation`.
- Keep the backend as the source of truth for reservation validity.

## Frontend Design
- Update the time picker to accept a minimum allowed time for the selected date.
- When the user selects today, hide or disable past time options and clear any now-invalid selection.
- Keep the existing booking flow intact: choose date, choose time, check availability, then book.

## Error Handling
- Same-day past slots return a user-facing validation message instead of the old generic future-date message.
- Out-of-hours slots remain blocked.

## Validation
- Manual checks should cover today with a future time, today with a past time, tomorrow, and an out-of-hours time.
