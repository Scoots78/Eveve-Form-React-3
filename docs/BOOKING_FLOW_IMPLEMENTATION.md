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
└─────┬────────┘                  │
      │ book()                    │
      ▼                            ▼
 (success/ failure)        Eveve /web/book
```

The widget remains a **client-side SPA**.  No server-side code is required for Phase 1.

* **UI layer:** React + Tailwind.  
* **State management:** local `useState` per component.  
* **Side-effects / API:** plain `fetch` wrapped in custom hooks.  
* **Modal:** Headless UI `<Dialog>` keeps the flow in-page (no scroll jump).  

---

## 2 Key Components & Hooks

| Path | Purpose |
|------|---------|
| `src/components/booking/BookingDetailsModal.jsx` | Displays booking summary, collects customer data, orchestrates `/web/update` → `/web/book`. |
| `src/hooks/booking/useHoldBooking.js` | POST/GET `/web/hold`, returns `holdToken`, `card`, `perHead`, `until`. |
| `src/hooks/booking/useUpdateHold.js` | Adds customer details to the hold via `/web/update`. |
| `src/hooks/booking/useBookReservation.js` | Final confirmation through `/web/book`. |
| `src/utils/apiFormatter.js` | + `formatCustomerDetails()` to normalise names, phone, allergy etc. |
| `src/components/ReservationForm.jsx` | Integrates the above: triggers hold, opens modal, resets UI on success. |

All new hooks share a simple contract:

```ts
const { actionFn, isLoading, error, data } = useHook(baseUrl)
```

Errors are surfaced to the modal and shown inline.

---

## 3 API Integration Details

| Step | Endpoint | Method | Mandatory Params | Notes |
|------|----------|--------|------------------|-------|
| Hold | `/web/hold` | GET | `est,lng,covers,date,time` | Optional: `addons`, `area` – omitted when empty. |
| Update | `/web/update` | GET | `uid,fname,lname,email,phone` | Extra: `notes`, `optin`, `allergy`, `allergytext`. |
| Book | `/web/book` | GET | `uid` | Finalises the reservation. |

* **Base URL** taken from `appConfig.dapi` with fallback to `https://nz6.eveve.com`.  
* Query strings assembled via `URLSearchParams` to avoid encoding bugs.  
* All responses are expected to be JSON `{ ok:true/false, … }`; non-200 raises.

---

## 4 User Flow (Happy Path)

1. Guest picks **date → covers → time** in `ReservationForm`.
2. Presses **Proceed to Booking**.  
   • Component calls `useHoldBooking` → `/web/hold`.  
   • On success, `holdData` saved and `BookingDetailsModal` opens.
3. Guest fills **personal details**, optionally notes / allergy, clicks **Confirm Booking**.  
   • Modal calls `useUpdateHold` (shows spinner).  
   • If update succeeds, immediately calls `useBookReservation`.
4. `/web/book` returns `ok:true`.  
   • Modal switches to **success state** (green tick).  
   • Closing modal resets the entire form for a fresh booking.

Error states show red banner inside the modal; the user can retry or cancel without leaving the page.

---

## 5 Validation Rules Implemented

* All required text fields must be non-empty; email pattern `\S+@\S+\.\S+`.
* If `allergy.has == true` then `allergy.details` is required.
* Marketing **opt-in is pre-checked** (can be unticked).
* Add-on and area validation inherited from previous widget logic.

---

## 6 Extensibility Hooks – Phase 2 Preview

The code was written to allow seamless upgrade to card-flows:

* `holdData.card` is already read; modal simply hides Stripe section when `card==0`.
* A placeholder **state machine** (`bookingState`) is present – will gain `loadingIntent`, `awaitingCard` etc.
* Stripe helpers (`useStripeIntent`, Elements wrapper) will plug into the modal without touching `ReservationForm`.

---

## 7 Testing Checklist

1. Start dev server: `npm run dev`, open  
   `http://localhost:5183/testform25/?est=<yourEstId>`.
2. Complete a booking with **no addons, no area**.
3. Complete a booking with **menus & options**; verify quantities and price.
4. Toggle **“Any Area”** flag in remote config → modal should respect.
5. Force an API 500 (e.g. bad `est`) and check error surfaces.

---

## 8 Future Improvements (Phase 2)

| Area | Planned Work |
|------|--------------|
| Payments | Integrate Stripe Elements, confirm `SetupIntent` / `PaymentIntent` depending on `card` flag. |
| State Management | Move booking context to Zustand to avoid prop drilling across modal layers. |
| Countdown | Show hold expiry timer; auto-cancel when `until` lapses. |
| Webhooks | Handle `card==1` capture after booking via Stripe webhook. |
| E2E | Cypress scenarios for hold-update-book with and without payment. |

---

**Status:** Phase 1 delivered – widget now performs a full reservation cycle without credit-card requirements and is production-ready for `card == 0` establishments.
