# Admin Hero Card Design

**Goal:** Give all admin management screens a consistent premium top card like the existing table dashboard header.

## Direction

Use one shared `AdminHeroCard` component across the admin dashboard and management screens. Keep the same layout in every screen:
- badge with icon and section label
- utility action button on the right
- large title
- short descriptive subtitle

Each screen keeps the same structure but gets its own accent gradient so the admin area feels consistent without looking duplicated.

## Scope

- Add a reusable component in the frontend common components folder.
- Replace standalone page titles on admin drawer screens with the shared hero card.
- Keep filters, search bars, tabs, stats, and list content directly under the card.

## Notes

- Use existing font and color tokens.
- Keep pull-to-refresh behavior unchanged.
- Preserve current screen logic and only adjust presentation/layout.
