# Dish Review Refresh Design

## Goal
Make newly submitted dish ratings appear immediately when the user returns from the review form, without requiring a manual refresh.

## Approved Approach
- Keep the review submission flow unchanged.
- Refresh the menu screen when it regains focus.
- Refresh the dish detail screen when it regains focus.
- Reuse the existing dish fetch APIs instead of passing rating data manually between screens.

## Scope
- Frontend only
- `crown-oven-frontend/src/screens/dishes/MenuScreen.js`
- `crown-oven-frontend/src/screens/dishes/DishDetailScreen.js`

## Success Criteria
- After submitting a review, the updated rating is visible on the menu screen immediately.
- After submitting a review, the updated rating is visible on the dish detail screen immediately.
- No manual pull-to-refresh is required to see the new rating.
