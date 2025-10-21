# PR: Show alerts for critical config parse failures and guard EventCarousel rendering (Droid-assisted)

## Summary
- Add single-shot `window.alert` when parsing fails for critical variables: `eventsB` and `eventMessages` in `src/config/configLoader.js`.
- Ignore non-critical parse warnings for `currSym` and `count` (no alerts, keep console warn).
- Post-parse validation: alert if `eventsB` or `eventMessages` are missing or not arrays.
- Guard `EventCarousel` render in `ReservationForm.jsx` to only render when `appConfig.eventsB` is an actual array with items.

## Files Changed
- src/config/configLoader.js
  - Added critical-var alerting and post-parse validation with deduped alerts.
  - Left existing console warnings intact for non-critical vars.
- src/components/ReservationForm.jsx
  - Guarded `EventCarousel` render: `Array.isArray(appConfig?.eventsB) && appConfig.eventsB.length > 0`.

## Rationale
`eventsB` and `eventMessages` drive event features. If they fail to parse (often due to invalid HTML/entities in upstream Eveve config), the widget can misbehave. Immediate user-visible alerts help surface the root cause. Non-critical items (`currSym`, `count`) remain as warnings only, per request.

## How to Test
1. Start dev server and open `http://localhost:5173/?est=reignandpour`.
2. If upstream data is malformed, you should see an alert about failing to parse `eventsB` and/or `eventMessages`.
3. `EventCarousel` renders only when `eventsB` is an array with items. If the parser returns a string fallback, it will no longer render.

## Branch Name
feature/event-parse-alerts

## Checks
- Build and lint should pass.
- Tested locally on the `reignandpour` test system.

## Notes
Alerts are deduplicated per variable per page load. Messages include the `est` id to speed diagnosis.
