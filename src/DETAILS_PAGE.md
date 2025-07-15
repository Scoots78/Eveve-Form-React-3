# Booking Details Stage – Eveve React Widget

This stage finalises the customer journey from selecting a date, time, and guest count, to confirming a booking. It includes integrating the **Eveve hold API**, a **booking details modal overlay**, and optional **Stripe payment handling** for deposits or prepayment.

---

## 🔄 Booking Flow Overview

1. **Booking Form Completed:**  
   User selects date, time, guests, addons, areas.

2. **Hold Booking:**  
   Frontend sends data to Eveve `/web/hold` API.  
   If successful, reservation is temporarily held (token returned).

3. **Display Booking Details Modal:**  
   An overlay/modal appears (not scrolling down the page).  
   Customer enters personal info (first name, last name, email, phone, notes. With additions select boxes for options or tick boxes depending on setup).  
   If payment is required, Stripe Elements is shown in this modal.

4. **Stripe Payment (Optional):**  
   A payment intent is created using your backend.  
   The frontend confirms payment using Stripe Elements.  
   On success, booking proceeds.

5. **Confirm Booking:**  
   After successful form input (and optional payment), send to Eveve `/web/book` API to finalise.

---

## 🧱 Tech Used

- **React** – UI rendering
- **Tailwind CSS** – Styling
- **Vite** – Dev server & bundler
- **Headless UI** – Accessible modal for booking details
- **Stripe Elements** – Secure payment field rendering
- **Node.js (or Plesk backend)** – To create Stripe PaymentIntents

---

## ✨ UI Structure

### BookingDetailsModal.jsx

An overlay modal shown after a successful `/web/hold` API call.

Contains:
- Summary of selected booking (date, time, covers)
- Form fields: Name, Email, Phone, Notes
- (Optional) Stripe Elements card input
- Submit button to confirm and send to `/web/book`

---

## 🔐 Stripe Integration

### 1. Required Keys

| Key | Type | Usage | Stored Where |
|-----|------|-------|---------------|
| `STRIPE_SECRET_KEY` | Server-side | Create PaymentIntent | Environment (Plesk `.env`) |
| `STRIPE_PUBLISHABLE_KEY` | Client-side | Stripe Elements | `.env` and passed to client |

> ⚠️ `STRIPE_SECRET_KEY` must **never** be exposed to the frontend.

### 2. Backend Endpoint (Node/Plesk)

```js
POST /api/create-payment-intent
