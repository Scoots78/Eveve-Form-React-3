
# 📘 AI Context: Eveve Stripe Payment Flow Reference

This document outlines the API call sequence and data structure for handling **credit card deposits and no-show holds** via **Stripe** during an Eveve restaurant booking. Use this as a reference for interpreting and generating integration logic.

---

## 🔹 Booking Initiation – Eveve

### ➤ `hold` (Booking Hold)
**Purpose:** Reserve a booking slot.  
**Sample:**  
```plaintext
https://nz.eveve.com/web/hold?est=TestNZA&lng=en&covers=10&date=2025-07-25&time=16&area=1000
```
**Stripe Payment (Optional):**  
   A payment intent is created on the backend.  
   The frontend confirms payment via Stripe Elements.  
   Upon success, the booking proceeds.
   Eveve reponse from HOLD booking indicated the type of payment, which would be credit card regsitration used for future payment or for imediate payment or no credit card at all.
   Codes used:
   - 0 "card":0,"perHead":0,"until":""}
   - 1 "card":1,"perHead":3000,"until":"" Credit card registration only for the possible amount of $30.00
   - 2 "card":2,"perHead":3000,"until":""
If card is not 0 then this should be noted and the stripe process followed for this booking

---

## 🔹 Update Booking – Customer Details
**Note:** API calls and schema to be defined separately (TBC).
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
---

## 🔹 Stripe Payment Stage (This was initially after the update but we want to move this process to before the update)

### ➤ `ccrequest` – Stripe Form Redirect
**Purpose:** Displays Eveve-hosted Stripe card form.  
**Sample:**  
```plaintext
https://app.eveve.com/ccrequest?desc=0&lang=en&est=TestNZA&UID_Booked=42015&created=1752780515
```

---

## 🔹 Payment Intent & Setup Intent

### ➤ `pi-get` – Payment Intent Get
**Purpose:** Returns Stripe `client_secret`, `public_key`, and `customer`.  
**Sample (Deposit):**  
```plaintext
https://uk6.eveve.com/int/pi-get?est=TestNZA&uid=42015&type=0&desc=0&created=1752780515
```  
**Sample (No-show):**  
```plaintext
https://uk6.eveve.com/int/pi-get?est=TestNZA&uid=42023&type=0&desc=0&created=1752798771
```

---

### ➤ `deposit-get` – Deposit Charge
**Purpose:** Determines deposit rules and triggers charge (if `code:2`).  
**Sample (Deposit):**  
```plaintext
https://uk6.eveve.com/int/deposit-get?est=TestNZA&UID=42015&created=1752780515&lang=english&type=0
```  
**Sample (No-show):**  
```plaintext
https://uk6.eveve.com/int/deposit-get?est=TestNZA&UID=42023&created=1752798771&lang=english&type=0
```

---

## 🔹 WebSocket
**Sample:**  
```plaintext
wss://us12.eveve.com/api/notifications/?EIO=4&transport=websocket
```

---

## 🔹 Final Stripe and Booking Steps

### ➤ `restore` – Booking Validation
**Sample:**  
```plaintext
https://uk6.eveve.com/api/restore?est=TestNZA&uid=42015&type=0
```

### ➤ `pm-id` – Payment Method Submission
**Sample:**  
```plaintext
https://uk6.eveve.com/int/pm-id?est=TestNZA&uid=42023&created=1752798771&pm=pm_1RlrCVDXdlJD3I0quz1cIZSn&total=30000&totalFloat=300&type=0
```

---

### ➤ Stripe `setup_intents/:id/confirm` – Final Stripe Confirmation
**Sample:**  
```plaintext
https://api.stripe.com/v1/setup_intents/seti_1RlpIaDXdlJD3I0qaPImOJxG/confirm
```

---

## 🔸 Abbreviation Lookup

| Abbreviation | Meaning                         | Purpose                                |
|--------------|----------------------------------|----------------------------------------|
| `pi-get`     | Payment Intent - Get            | Get Stripe client secret               |
| `pm-id`      | Payment Method - ID             | Submit Stripe PM to Eveve              |
| `ccrequest`  | Credit Card Request             | Show Eveve-hosted Stripe Form          |
| `deposit-get`| Deposit Evaluation              | Determines deposit or no-show logic    |
| `restore`    | Booking Restore Validation      | Check if booking still valid           |

---

## 📊 Flowchart Overview

Below is the full visual flow:

![Eveve Stripe Flowchart](eveve_stripe_flowchart.png)

---


+---------------------+
|    Hold Booking     |
|     [hold]          |
+---------------------+
            |
            v
+---------------------+
|   Update Booking    |
|     [TBC]           |
+---------------------+
            |
            v
+---------------------+
|   Stripe Form Load  |
|    [ccrequest]      |
+---------------------+
            |
            v
+---------------------+
|  Get Client Secret  |
|     [pi-get]        |
+---------------------+
            |
            v
+----------------------------+
|  Deposit/No-show Decision |
|      [deposit-get]        |
+----------------------------+
            |
            v
+---------------------+
|  Restore Booking    |
|     [restore]       |
+---------------------+
            |
            v
+------------------------------+
| Submit Payment Method ID    |
|         [pm-id]             |
+------------------------------+
            |
            v
+-------------------------------+
|  Stripe SetupIntent Confirm   |
| [setup_intents/:id/confirm]  |
+-------------------------------+

( Optional WebSocket Connection )
            |
            v
+---------------------+
|   [notifications]   |
+---------------------+
