# Illustrations

Drop a PNG here with one of these exact names and it replaces the watercolor-blob fallback everywhere it's used. No code changes needed. Sizes are 3× for a 390pt-wide phone.

| File | Size (px) | Where |
|---|---|---|
| `hero-grandma.png` | 1170 × 1140 | Letterbox and recording hero (top ~47% of the screen) |
| `hero-grandma-tea.png` | 1170 × 780 | "When should they hear it?" hero |
| `house-tainan.png` | 288 × 288 | Card thumbnail, 1st life stage (and the family cover placeholder) |
| `market-street.png` | 288 × 288 | Card thumbnail, 2nd life stage |
| `kitchen-bowl.png` | 288 × 288 | Card thumbnail, 3rd life stage |
| `leaves-top-left.png` | 600 × 600, transparent | Branch in the top-left corner of every screen |
| `leaves-top-right.png` | 600 × 600, transparent | Branch in the top-right corner (drawn as-is; the fallback is mirrored) |
| `mango-branch.png` | 720 × 480, transparent | Family Book footer, empty states |
| `avatar-lily.png` | 240 × 240 | Lily's round portrait (header avatar, "For Lily" row) |
| `avatar-ama.png` | 240 × 240 | Ama's round portrait |

Keep the important part of each hero in the upper-middle; the bottom fades into the page. To add a portrait for someone else, add `avatar-<firstname>.png` here and the name to `ILLUSTRATIONS` in `src/lib/illustrations.ts`.
