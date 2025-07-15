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
   Customer enters personal info (first name, last name, email, phone, notes. With additions select boxes for booking options, customer options and dietaries depending on setup).
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
- Form fields: Last Name, First Name, Email, Phone, Notes, booking options, customer options. Name details variables names  (var details = {lastname:''firstName:''phone:''email:''notes:''bookOpt:''guestOpt:''};)
- (Optional depending on eveve setup) Booking options & Cusotmer options tick boxes required
      Booking options required on this page are identified in the initial call from eveve web/form and look like this sample.
      var options = [[0,1023,"Tickbox","Test Booking option 1"],[0,1024,"Yes/No","Test Booking option 1"],[1,1001,"Tickbox","Customer options 1"],[1,1002,"Yes/No","Customer options 2"]]
      Tick box shoulod be a tick box, Yes/No should be radio button with yes/no options.
- (Optional depending on eveve setup) Dietaries - new dieteires/allergy  box on eveve must be duplicated on this form
      dieteires and allergy - importing web form there is a varable called const  allergy = true; if true alergies box must be displayed like so, 'We have allergies / dietary requirements' with a yes/no radio button, if the yes radio button is ticked then show a diaplog box to enter alergies with the help text "Please specify"
- (Optional) Stripe Elements card input
- Submit button to confirm and send to `/web/book`. Full request would look like this "https://nz.eveve.com/web/update?est=TestNZA&uid=41975&lng=en&lastName=Last%20name%20of%20Customer&firstName=First%20name%20of%20customer&phone=%252B447720848732&email=email_of_customer@eveve.com&addons=1000:2,1001:1&notes=This%20is%20the%20notes%20field%20text%20can%20be%20written%20here&dietary=This%20is%20is%20for%20dietary%20requirements%20or%20allergies%20text%20is%20entered%20by%20cusomter&allergies=This%20is%20is%20for%20dietary%20requirements%20or%20allergies%20text%20is%20entered%20by%20cusomter&bookopt=1023,1024&guestopt=1001,1002&optem=1"
- Response will contain "ok":true for succesfull booking eg "{"ok":true,"totals":[0,0,3,0],"loyalty":[],"optins":1}"
- Configuarable success message should display on succesfull booking with all details and booking summry for the users confirmation

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
