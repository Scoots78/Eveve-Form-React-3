# Eveve Availability: Requests, Responses, and Handling (Current vs New)

This document explains how the widget requests availability, how we parse responses, and how we will adapt to recent API changes (month/day availability and event handling).

## Sources of Truth

- Form bootstrap (GET `/web/form?est={est}`): provides configuration and inline event metadata.
  - Example snippet (eventsB):
    ```js
    const eventMessages = [];
    const eventsB = [
      {
        uid: 1000,
        area: -1,
        month: 1,
        from: 45931,
        to: 45931,
        name: "Event Suppress Regular",
        min: 1,
        max: 6,
        early: 17.00,
        late: 22.00,
        showCal: true,
        addons: [],
        usage: 0,
        avail: [17.00,17.25,17.50,17.75,18.00,18.25,18.50,18.75,19.00,19.25,19.50,19.75,20.00,20.25,20.50,20.75,21.00,21.25,21.50,21.75,22.00],
        exclude: [],
        noServ: false,
        showCal: true,
        desc: ""
      },
      {
        uid: 1001,
        area: -1,
        month: 1,
        from: 45932,
        to: 45932,
        name: "Event the does not suppress ",
        min: 1,
        max: 6,
        early: 18.00,
        late: 19.00,
        showCal: true,
        addons: [],
        usage: 0,
        avail: [18.00,18.25,18.50,18.75,19.00],
        exclude: [],
        noServ: false,
        showCal: true,
        desc: ""
      }
    ];
    ```

- Month availability (GET `/web/month-avail`): now supports these inputs
  - Required: `date=YYYY-MM-DD` (API returns the month that contains this date; effectively the 1st of month)
  - Optional: `covers`, `time`, `event`
  - Behavior note: response represents month view for the month-of-`date`, even if `date` is mid-month.

- Day availability (GET `/web/day-avail`): returns shifts, times, areas, and addons for a specific day.

## Current Implementation (before changes)

Code references:
- Month fetching/parsing: `src/utils/monthAvailability.js`
  - Request: `GET {dapi}/web/month-avail?est={est}&covers=2&date=YYYY-MM-01`
  - Parse: treats a day as closed when `times[dayIndex][0]` is an empty array; returns an array of disabled `Date`s.

- Day fetching/parsing: `src/components/ReservationForm.jsx` (fetchAvailability)
  - Request: `GET {dapi}/web/day-avail?est={est}&covers={n}&date=YYYY-MM-DD`
  - Parse expectations:
    - `data.shifts[]` with `{ name, type, uid?, start, end, description?, message?, times[] }`
    - `times[]` entries are numbers or `{ time, addons?, usage?, event? }`
    - `data.areas[]` (top-level) filtered to the selected `time`
    - Negative `time` values are ignored (blocked)

- Event handling: `src/utils/eventAvailability.js` + `ReservationForm.jsx`
  - Event shift times are constrained to times available in non-Event shifts (intersection logic).
  - Event ID is captured from: `shift.uid` (when `type === "Event"`) → else `timeObject.event` → else `shift.event`.
  - Event ID forwarded to `/web/hold` when present.

## New Inputs/Constraints to Support

1) Events defined in `/web/form` (`eventsB`)
   - Provide explicit `avail` times per event/day window.
   - Some events suppress regular service (“Suppress Regular”); others may coexist with regular shifts.
   - Fields observed: `{ uid, from, to, early, late, avail[], exclude[], min, max, area, usage, addons, noServ, showCal, desc }`.

2) Month availability parameters
   - Accepts `time` and/or `event` to influence month view.
   - Always returns month-of-`date` (1st-of-month anchor), irrespective of which day within the month is provided.

### Month-availability response variants (examples)

Variant A — legacy matrix with per-day tuples (regular/event/hours/sessions/message):

```json
{
  "est": "TestNZB",
  "estFull": "Test Blue Breeze Inn",
  "noStandby": [],
  "from": "2025-10-01",
  "times": [
    [
      [12.00,12.25,12.50,12.75,13.00,13.25,13.50,13.75,14.00,14.25,14.50,14.75,15.00,15.25,15.50,15.75,16.00,17.00,17.25,17.50,17.75,18.00,18.25,18.50,18.75,19.00,19.25,19.50,19.75,20.00,20.25,20.50,20.75,21.00,21.25,21.50,21.75,22.00],
      [18.00,18.25,18.50,18.75,19.00,20.75,21.00,21.25,21.50,21.75,22.00],
      [[12.00,16.00],[12.00,16.00],[17.00,22.00],[17.00,22.00]],
      [0,1,2,3],
      ""
    ],
    [[],[],[[],[],[],[]],[],"We are closed today for the Public Holiday"]
  ]
}
```

Interpretation:
- For each day in the month, `times[day]` is an array tuple of length 5:
  1. regularTimes[] (decimal times)
  2. eventTimes[] (decimal times) — if any
  3. hoursRanges[] (e.g., service windows)
  4. sessionIndexes[]
  5. message string (may be empty)
- A “closed” day typically presents empty arrays for regular/event times and may include a closure message.

Variant B — filtered by a requested time (and optionally event):

```json
{
  "est": "TestNZB",
  "full": "Test Blue Breeze Inn",
  "first": "2025-10-01",
  "avail": [1,1,2,1,1,5,1,1,1,1,1,1,5,1,1,1,1,1,1,5,1,1,1,1,1,1,5,1,1,1,1],
  "events": [
    {"uid":1000, "showCal":true, "avail":[0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},
    {"uid":1001, "showCal":true, "avail":[0,0,0,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]}
  ]
}
```

Notes:
- Query: `/web/month-avail?est=...&covers=...&date=YYYY-MM-01&time=DECIMAL[&event=UID]`.
- `avail[]` is a per-day code for regular availability (not event times). Event-specific arrays are under `events[].avail`.
- If `event` is supplied, `events` can still include multiple entries; the client should target the requested UID.

### Avail codes (per-day values)

From the API semantics provided:
- 0 = Not available
- 1 = Narrow window (near requested time)
- 2 = OK (Available)
- 3 = Wide (Available, window further from requested)
- 4 = Available at another time or session (applies to event context)
- 5 = Closed

Widget treatment guidance:
- Calendar “disabled” dates should reflect true closures (code 5). Codes 0–4 indicate some logic relative to `time`/session and should generally remain selectable to let day-level fetching resolve specifics.
  - Exception: if product decides to grey out 0 (no availability at requested time) without disabling, we can style differently while still allowing click.

## Widget Behavior — Target Specification

This is how we will treat availability after adapting to the new responses:

1) Month view (calendar disabled dates)
   - Base request: `GET /web/month-avail?est={est}&covers={C}&date={YYYY-MM-01}`.
   - When the user is viewing an Event context (e.g., an Event shift is in focus or an event is preselected), include `event={eventUid}`. If a specific tentative time is in context (e.g., from `eventsB.avail`), include `time={decimal}` to refine availability.
   - Parsing rules:
     - If response has `times` (matrix): a day is “closed” when both regular and event arrays are empty (and/or message indicates closure). Do not assume fixed tuple shapes beyond positions listed above.
     - If response has `avail` (codes): a day is “closed” when code is 5. Other codes are actionable (not disabled) and inform UI hints.

2) Day view (shift grid)
   - Default request unchanged: `GET /web/day-avail?est={est}&covers={n}&date={YYYY-MM-DD}`.
   - Event logic:
     - If an Event is active for the selected date (present in `eventsB` for that day window), show Event shift with `eventsB.avail` times.
     - If the event suppresses regular service, hide conflicting non-Event shifts/times for that date.
     - If the event does not suppress, merge: show event times and regular shifts; avoid duplicates.
   - Stop requiring intersection-with-regular for Event times. Prefer explicit `eventsB.avail` (from `/web/form`) or day-level event times when present.
   - Remember: month-level `avail` applies to regular sessions; event-specific daily markers reside under `events[].avail`.

3) Hold/Update
   - Continue forwarding `event={uid}` to `/web/hold` when booking an event time.

## Planned Code Changes (follow-up PRs)

1) monthAvailability API wrapper
   - Update signature to accept options: `{ covers = 2, time, eventUid }`.
   - Propagate optional `time` and `event` query params when present.
   - Replace `parseClosedDatesFromMonthResponse` with a parser that works with the new response schema (no assumptions about `[0]`).

2) Event times derivation
   - Read `eventsB` from `/web/form` (already loaded in config) and prefer `eventsB.avail` for Event shift times.
   - Add support for a `suppressesRegular` flag (heuristic until an explicit flag is provided). Interim: treat events named like “Suppress Regular” as suppressors; replace with real flag when available.
   - If suppressing: hide regular shifts for those event dates; otherwise, merge.

3) Day grid rendering
   - Keep filtering negative times.
   - Remove the current constraint that Event times must exist in non-Event shifts; use `eventsB.avail` instead.

4) Safety/compat
   - If `eventsB` is absent or incomplete, fall back to current behavior.
   - Gate new logic behind presence of `eventsB` entries for the target date.

## Open Questions

- Is there an explicit boolean flag indicating “suppress regular” vs “coexist”? If so, what field name?
- Confirm the canonical schema for `/web/month-avail` response under `event`/`time` filters.
- Date range fields `from`/`to` look like serials (e.g., 45931). Confirm epoch/origin for robust date conversion.

## Testing Notes

- Use `?est=TestNZb` to exercise `eventsB` samples above.
- Verify month view when:
  - No event filter (baseline)
  - With `event={uid}` only
  - With `event={uid}&time={decimal}`
- Verify day view rendering for a suppressing event vs a non-suppressing event.

---

Maintainer: Update this document when additional Eveve availability fields/flags are confirmed.
