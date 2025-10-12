# Fix Calendar Hover Sizing Inconsistency

## Problem
Calendar date elements were changing size when hovered, causing the overall form height to shift and creating a poor user experience. This occurred because hover states added circle styling with specific dimensions (2.25rem width/height) while non-hovered dates had no guaranteed sizing.

## Solution
- **Added consistent sizing** to all `.react-calendar__tile abbr` elements (2.25rem min-width and height)
- **Removed redundant sizing** from hover-specific rules since all elements now have consistent dimensions
- **Maintained existing visual styles** while preventing layout shifts

## Technical Changes
### `src/components/calendar-override.css`
1. Added base sizing to all date elements:
   ```css
   .react-calendar-custom .react-calendar__tile abbr {
     min-width: 2.25rem;
     height: 2.25rem;
     border-radius: 9999px;
     display: inline-flex;
     align-items: center;
     justify-content: center;
     transition: background-color 120ms ease, box-shadow 120ms ease, border 120ms ease;
   }
   ```

2. Simplified hover rules by removing duplicate sizing properties:
   ```css
   .react-calendar-custom .react-calendar__tile:enabled:hover abbr,
   .react-calendar-custom .react-calendar__tile:enabled:focus abbr {
     background-color: hsl(var(--p, 220 90% 56%) / 0.18);
     color: hsl(var(--bc));
     border: 1px solid hsl(var(--p, 220 90% 56%) / 0.4);
     box-shadow: 0 0 0 2px hsl(var(--p, 220 90% 56%) / 0.08);
     /* Removed: min-width, height, border-radius, display, align-items, justify-content */
   }
   ```

## Testing
- ✅ Build passes successfully  
- ✅ Calendar dates maintain consistent size on hover
- ✅ Visual styling preserved (circles, colors, shadows)
- ✅ No layout shifts when hovering over dates

## Branch
- **Feature branch**: `feature/calendar-hover-fix`
- **Target**: `main`

---

**Droid-assisted** - Created by Factory AI to resolve calendar hover sizing inconsistency issue.