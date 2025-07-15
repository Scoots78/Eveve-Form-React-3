
# Booking Details Stage – Eveve React Widget

This stage finalizes the customer journey from selecting a date, time, and guest count to confirming a booking. It involves integrating the **Eveve hold API**, a **booking details modal overlay**, and optional **Stripe payment handling** for deposits or prepayment.
 
---

## 🔄 Booking Flow Overview

1. **Booking Form Completed:**  
   The user selects the date, time, guest count, add-ons, and areas.

2. **Hold Booking:**  
   The frontend sends the data to the Eveve `/web/hold` API.  
   If successful, the reservation is temporarily held, and a token is returned.

3. **Display Booking Details Modal:**  
   An overlay/modal appears (without scrolling down the page).  
   The customer enters personal info (first name, last name, email, phone, notes). Depending on the setup, additional options for booking, customer preferences, and dietary needs may be included.  
   If payment is required, **Stripe Elements** is shown in this modal.

4. **Stripe Payment (Optional):**  
   A payment intent is created on the backend.  
   The frontend confirms payment via Stripe Elements.  
   Upon success, the booking proceeds.

5. **Confirm Booking:**  
   After successful form input (and optional payment), the booking is finalized by sending the data to the Eveve `/web/book` API.

---

## 🧱 Tech Used

- **React** – UI rendering
- **Tailwind CSS** – Styling
- **Vite** – Dev server & bundler
- **Headless UI** – Accessible modal for booking details
- **Stripe Elements** – Secure payment field rendering
- **Node.js (or Plesk backend)** – Used to create Stripe Payment Intents

---

## ✨ UI Structure

### BookingDetailsModal.jsx

An overlay modal displayed after a successful `/web/hold` API call.

#### Contains:
- A summary of the selected booking (date, time, covers)
- Form fields: Last Name, First Name, Email, Phone, Notes, booking options, customer options. The variable names are defined as:  
  ```javascript
  var details = { lastName: '', firstName: '', phone: '', email: '', notes: '', bookOpt: '', guestOpt: '' };
  ```
  
- **Optional (based on Eveve setup):**  
  Booking options and Customer options (tick boxes, dropdowns) are required on this page. These options are passed during the initial call from Eveve's `/web/form` API and look like this example:  
  ```javascript
  var options = [[0, 1023, "Tickbox", "Test Booking Option 1"], [0, 1024, "Yes/No", "Test Booking Option 2"], [1, 1001, "Tickbox", "Customer Option 1"], [1, 1002, "Yes/No", "Customer Option 2"]];
  ```
  - Tickboxes should be rendered as checkboxes.
  - Yes/No options should be displayed as radio buttons.

- **Optional (based on Eveve setup):**  
  Dietary and allergy information fields (if allergies are enabled in Eveve’s settings). If the `const allergy = true;` variable is set, the form should display the following:  
  - "We have allergies/dietary requirements" with a Yes/No radio button.  
  - If "Yes" is selected, a dialog box should appear asking the user to enter their dietary or allergy details with the help text "Please specify."

- **Optional:** Stripe Elements card input
- A **Submit button** to confirm and send data to `/web/book`. The full request would look like this:
  ```
  https://nz.eveve.com/web/update?est=TestNZA&uid=41975&lng=en&lastName=Last%20name&firstName=First%20name&phone=%252B447720848732&email=email%40eveve.com&addons=1000:2,1001:1&notes=Notes%20here&dietary=Dietary%20requirements%20text&allergies=Allergies%20text&bookopt=1023,1024&guestopt=1001,1002&optem=1
  ```

- **Response:**  
  If the booking is successful, the response will contain `"ok": true`. For example:  
  ```json
  { "ok": true, "totals": [0, 0, 3, 0], "loyalty": [], "optins": 1 }
  ```

- **Success Message:**  
  A configurable success message should display after the booking is successfully made, showing all booking details and a summary for user confirmation.

---

## 🔐 Stripe Integration

### 1. Required Keys

| Key                     | Type        | Usage                      | Stored Where           |
|-------------------------|-------------|----------------------------|------------------------|
| `STRIPE_SECRET_KEY`      | Server-side | Create PaymentIntent        | Environment (Plesk `.env`) |
| `STRIPE_PUBLISHABLE_KEY` | Client-side | Render Stripe Elements      | `.env` (passed to client) |

> ⚠️ **Important:** `STRIPE_SECRET_KEY` must **never** be exposed to the frontend.

### 2. Backend Endpoint (Node/Plesk)

```js
POST /api/create-payment-intent
```
