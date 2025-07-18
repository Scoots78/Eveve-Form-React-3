# Booking Flow – Phase 1 (No-Card) Implementation Guide

This document explains the first milestone that extends the Eveve React Widget from “time-slot picker” to a **complete reservation flow** for restaurants that **do not require a credit-card** (`card == 0`).  
It is aimed at developers who need to maintain, extend or audit the code.

---

## 1 Architecture Overview

```
┌──────────────┐               ┌──────────────┐
│ Reservation  │   hold()      │ Eveve /web/  │
│  Form        │──────────────►│  hold        │
│  (SPA)       │◄──────────────│              │
└─────┬────────┘   holdToken    └────┬─────────┘
      │                            │
      │ opens modal                │
      ▼                            │
┌──────────────┐   update()       │
│ Booking      │──────────────►   │
│  Details     │◄──────────────   │
│  Modal       │   ok:true        │
└──────────────┘                  │
        ▲                         │
        │ (success / failure)     │
        └─────────────────────────┘
```

`/web/update` is the **final confirmation** call; no subsequent API calls are required in Phase 1.

* **UI layer:** React + Tailwind  
* **State management:** local `useState` per component  
* **Side-effects / API:** plain `fetch` wrapped in custom hooks  
* **Modal:** Headless-UI `<Dialog>` keeps the flow in-page  

---

## 2 Key Components & Hooks

| Path | Purpose |
|------|---------|
| `src/components/booking/BookingDetailsModal.jsx` | Displays booking summary, collects customer data, orchestrates `/web/update`. |
| `src/hooks/booking/useHoldBooking.js` | Calls `/web/hold`, returns `{ holdToken, card, perHead, until }`. |
| `src/hooks/booking/useUpdateHold.js` | Finalises the reservation via `/web/update`. |
| `src/utils/apiFormatter.js` | `formatCustomerDetails()` normalises names, phone, allergies, options… |
| `src/components/ReservationForm.jsx` | Integrates the above: triggers hold, opens modal, resets UI on success. |

All hooks expose a common signature:

```ts
const { actionFn, isLoading, error, data } = useHook();
```

---

## 3 API Integration Details

| Step   | Endpoint      | Method | Mandatory Params                    | Notes |
|--------|---------------|--------|-------------------------------------|-------|
| Hold   | `/web/hold`   | GET    | `est,lng,covers,date,time`          | Optional: `addons`, `area` when present |
| Update | `/web/update` | GET    | `uid,lastName,firstName,phone,email`| Extra: `notes,optins,bookopt,guestopt,allergies,dietary`.<br>Returns `{ ok:true, totals:[…], loyalty:[…], optins }` and **completes the booking**. |

* Base URL derived from `appConfig.dapi` (falls back to `https://nz6.eveve.com`).  
* Query strings constructed with `URLSearchParams` to guarantee encoding correctness.  
* Non-200 or `ok:false` responses bubble up as errors.

---

## 4 User Flow (Happy Path)

1. Guest selects **date → covers → time** in `ReservationForm`.  
2. Presses **Proceed to Booking**.  
   • Component invokes `useHoldBooking` → `/web/hold`.  
   • On success, `holdData` is stored and `BookingDetailsModal` opens.
3. Guest enters **personal details**, opt-in box (pre-checked), allergy info, then clicks **Confirm Booking**.  
   • Modal calls `useUpdateHold` (loading spinner).  
   • `/web/update` returns `ok:true` → modal shows **success state** (green tick).  
   • Closing the modal resets the form for a fresh booking.

If `/web/update` fails the modal shows an inline error; the guest can retry or cancel.

---

## 5 Validation Rules Implemented

* Required fields: `firstName`, `lastName`, `email`, `phone`.  
* Email regex: `\S+@\S+\.\S+`.  
* Opt-in checkbox defaults to **checked** (`optins=1`) but users may untick (→ 0).  
* If allergies feature enabled and **Yes** selected, the textarea becomes required.  
* Add-on and area rules inherited from the availability logic.

---

## 6 Extensibility Hooks – Phase 2 Preview (Card Flows)

In credit-card scenarios the booking MUST be created first (via `/web/update`) **before** Stripe credentials can be fetched using `pi-get`.  
Planned approach:

1. Execute `/web/update` invisibly once details are submitted.  
2. Fetch Stripe client secret (`pi-get`), render Elements, process card.  
3. If card entry fails or times-out, call Eveve cancellation endpoint (TBD) and show an error.

The current code already:

* Stores `card` flag from hold response.  
* Hides Stripe UI when `card == 0`.  
* Provides state placeholders (`loadingIntent`, `awaitingCard`, etc.) to be activated in Phase 2.

---

## 7 Testing Checklist

1. Dev server `npm run dev` → open widget with `?est=<EstId>`.  
2. Complete a booking with **no add-ons**, verify success splash.  
3. Complete a booking with **menus/options**; confirm quantities reflected in the confirmation JSON.  
4. Toggle **allergy flag** in config; verify conditional fields.  
5. Un-tick the **marketing opt-in** and observe `optins:0` in update call.  
6. Force API failure (e.g., wrong `uid`) → modal shows error & allows retry.

---

## 8 Future Improvements

| Area | Idea |
|------|------|
| Payments | Add Stripe Elements flow per Phase 2 plan. |
| Countdown | Display hold expiry timer; auto-cancel when reached. |
| State | Migrate to Zustand once flow grows. |
| Webhooks | For `card == 1` captures, reconcile via Stripe webhook. |
| E2E | Cypress end-to-end covering hold-update (and later card flows). |

---

**Status:** Phase 1 delivered – widget now performs a full reservation cycle with `/web/update` as the final confirmation and is production-ready for establishments with `card == 0`.
