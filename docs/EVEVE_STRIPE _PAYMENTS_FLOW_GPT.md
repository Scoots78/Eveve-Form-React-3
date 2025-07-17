
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

---

## 🔹 Update Booking – Customer Details
**Note:** API calls and schema to be defined separately (TBC).

---

## 🔹 Stripe Payment Stage (Triggered Post-Update)

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
