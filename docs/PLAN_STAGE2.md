# Booking Flow – Phase 2 Implementation Plan  
*File: docs/PLAN_STAGE2.md*

# Booking Flow – Phased Implementation Plan

The booking widget will be delivered in **two clear stages**:

• **Phase 1 – Booking Finalisation (No-Card Flow)**  
  – Complete the end-to-end journey for restaurants that **do not require a credit card** (`card == 0`).  
  – Hold → customer-details modal → `/web/book` confirmation.  
  – Stripe code paths stubbed / hidden.  

• **Phase 2 – Stripe-Enabled Flow**  
  – Extend the Phase 1 implementation to handle `card == 1` (SetupIntent) and `card == 2` (PaymentIntent) scenarios.  
  – Uses Eveve `/int/pi-get` to obtain Stripe credentials, renders Elements, confirms the intent, then books.  

—

General Scope (both phases)  
• React front-end additions (widget).  
• No custom backend – Stripe client secrets come from Eveve `/int/pi-get`.  
• Payment rules driven by `card` flag from Eveve hold response (Stripe paths only active in Phase 2).  

---

## Phase 1 – High-Level Sequence *(No Card Required)*

```
UI (React) ── /web/hold ──► Eveve
               ◄─ {holdToken, card:0, perHead, until}

open BookingDetailsModal   (no Stripe fields)
      └─ user submits details

UI ── /web/update (+holdToken, customer data) ──► Eveve
Eveve ◄──────────────────────────────────────── { ok:true }

UI ── /web/book (+holdToken) ──► Eveve
Eveve ◄──────────────────────────────────────── { ok:true }
```

—

## Phase 2 – High-Level Sequence *(Stripe Enabled)*

```
UI (React) ── /web/hold ──► Eveve
               ◄─ {holdToken, card, perHead, until}

if card == 0
    open BookingDetailsModal  (no payment)
else if card == 1           (card registration only)
    UI ── /int/pi-get?type=0 ──► Eveve
           Eveve ◄───────────── {client_secret, public_key, type:0}
    UI ── loadStripe(public_key)
    UI ── confirmCardSetup(client_secret) ──► Stripe
    UI ── confirmCardSetup ──► Stripe
    Stripe ◄────────────────────

    UI ── /int/pi-get?type=2 ──► Eveve
           Eveve ◄───────────── {client_secret, public_key, type:2}
    UI ── loadStripe(public_key)
    UI ── confirmCardPayment(client_secret) ──► Stripe
    UI ◄────────── {clientSecret}
    UI ── confirmCardPayment ──► Stripe
    Stripe ◄────────────────────

UI ── /web/update (+holdToken, customer data) ──► Eveve
Eveve ◄──────────────────────────────────────── { ok:true }

UI ── /web/book (+holdToken, paymentIntentId?) ──► Eveve
Eveve ◄────────────────────────────────────────────────────────── { ok:true }
```

---

## 2 Front-End Work
The table below shows which sub-tasks belong to each phase.

### 2.1 `BookingDetailsModal.jsx`

| Feature | Notes |
|---------|-------|
| Trigger | Shows after successful `/web/hold`. (`headlessui` `Dialog`) |
| Summary | Date, time, covers, area, addons, **total price** (optional). |
| Form    | `lastName`, `firstName`, `phone`, `email`, `notes`, plus booking & guest options from `options` array. |
| Allergy | Render when `allergy === true` → Yes/No radio, textarea if Yes. |
| Opt-in  | Mailing-list checkbox (`optins` 0/1). **Pre-ticked**; user can untick. |
| Stripe  | **Phase 2** – Render Elements only when `card !== 0`. |
| Submit  | Phase 1: enabled when form valid.<br>Phase 2: additionally waits for successful payment confirmation when `card>0`. |

Internal modal state:  
`idle → loadingIntent → awaitingCard → confirming → booking → success / error`

### 2.2 Hooks / Context

* `useHoldBooking` – wraps `/web/hold`.  
* `useUpdateHold` – wraps `/web/update` (adds customer details to hold).  
* **Phase 2** – `useStripeIntent` fetches `/int/pi-get` and returns `clientSecret`, `pubKey`, `type`.  
* `useBookReservation` – wraps `/web/book`.  
* Share booking context via Zustand or React Context.

### 2.3 Helpers

Extend `apiFormatter.js` with  
* `formatCustomerDetails(details)`  

## 3 Stripe Intent Retrieval via Eveve
*(Phase 2 only)*

Eveve exposes a proxy that returns ready-to-use Stripe credentials:

```
GET https://uk6.eveve.com/int/pi-get
        ?est=<est>
        &uid=<holdUid>
        &type=<0|2>   // 0 = SetupIntent, 2 = PaymentIntent
        &desc=0
        &created=<unixSecs>
```

Example response:

```json
{
  "client_secret": "seti_***_secret_***",
  "public_key": "pk_test_***",
  "type": 0,
  "cust": "cus_***"
}
```

Front-end flow:

1. Call endpoint with the correct `type` based on `card`.  
2. Initialise Stripe with `public_key`.  
3. `type 0` → `confirmCardSetup(client_secret)`  
   `type 2` → `confirmCardPayment(client_secret)`  

No server-side Stripe keys are required, greatly simplifying deployment.

---

## 4 Payment Decision Matrix
*(Phase 2 only)*

| `card` | Eveve `type` | Meaning | Stripe call |
|-------:|-------------:|---------|-------------|
| 0 | — | No card required | — |
| 1 | 0 | Card registration (save on file) | `confirmCardSetup` (SetupIntent) |
| 2 | 2 | Immediate charge | `confirmCardPayment` (PaymentIntent) |
| 1 | Card registration (save on file) | Show card, `confirmCardSetup` | **SetupIntent** |
| 2 | Immediate charge | Show card, `confirmCardPayment` | **PaymentIntent** (`automatic`) |

`amount = perHead × guestCount` (minor units, e.g. 3000 ⇒ $30.00).

## 5 Customer-Data Handling

## 5 Customer-Data Handling

Three patterns:

1. Pass-through only (default) – widget sends data straight to Eveve; backend stores nothing.  
2. Transient logging – keep for 24 h for support, then purge.  
3. Persistent storage / CRM – save to DB or push to marketing tools (GDPR obligations).

Recommendation: start with (1) and revisit later.

---

## 6 Error & Edge Cases

| Scenario | UX | Action |
|----------|----|--------|
| Hold fails | Toast, allow retry | Stay on main form |
| PaymentIntent fails | Inline error, retry | Backend 4xx/5xx |
| 3-DS / card failure | Stripe error shown, stay in modal | — |
| `/web/book` fails | Error view, *Try again* | Optionally cancel PaymentIntent |
| `/web/update` fails | Toast, stay in modal | Allow retry or cancel hold |
| User closes modal mid-flow | Ask *Cancel booking?* | Let hold expire or call Eveve cancel |

---

## 7 Implementation Milestones

### Phase 1 Milestones *(No-Card Flow)*

1. Build `BookingDetailsModal` (without Stripe fields) & state machine – **1 day**  
2. Implement `useHoldBooking`, `useUpdateHold`, data-formatting helpers, and `/web/update` + `/web/book` integration – **1.0 day**  
3. QA + edge-case tests, deploy to staging – **0.25 day**  

**Phase 1 total: ~2.25 developer-days**

### Phase 2 Milestones *(Stripe Enabled)*

1. Add Stripe Elements provider & `useStripeIntent` hook – **0.5 day**  
2. Extend modal with payment fields and intent-confirmation logic – **0.5 day**  
3. Payment QA (3-DS, failure paths) & deploy – **0.25 day**  

**Phase 2 total: ~1.25 developer-days**

---

## 8 Future Enhancements

* Hold countdown timer & auto-release.  
* Stripe webhook capture flow for `card==1` holds.  
* Multi-currency based on Eveve config.  
* Cypress E2E tests for happy path & payment scenarios.

---

*Prepared 16 Jul 2025*  
