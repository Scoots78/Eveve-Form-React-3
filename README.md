
# Eveve React Widget

A frontend booking widget built with **React**, **Tailwind CSS**, and **Vite**, designed to integrate with the **Eveve restaurant booking API**. This project is currently under development and aims to provide an embeddable widget that restaurants can use to allow customers to select dates, guest numbers, and dynamically retrieve configuration data using their Eveve UID.

---

## 🚀 Tech Stack

- **React** – Component-based UI rendering
- **Tailwind CSS** – Utility-first styling
- **Vite** – Fast development server and build tool
- **react-flatpickr** – Date picker library
- **DOMParser** – Used to parse Eveve's remote HTML forms
- **ESBuild** – Powered by Vite for fast bundling

---

## 🎯 Current Features

- [x] Working React + Vite + Tailwind base
- [x] Styled guest selector with `+` and `–` buttons
- [x] Date display (read-only)
- [x] Dynamic parsing of Eveve restaurant form via UID from URL (?est=testnza)
- [x] Logs relevant `<script>` data to the console for future integration

---

## 🔧 Setup Instructions

1. Clone the repository or extract the zip.
2. Navigate into the project folder:
   ```bash
   cd eveve-react-widget
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Run the development server:
   ```bash
   npm run dev
   ```
5. Open your browser to [http://localhost:5173/?est=testnza](http://localhost:5173/?est=testnza)

---

## 📌 Goals

- Add fully interactive calendar picker
- Connect guest/date selections to Eveve booking session flow
- Parse availability and time slots from Eveve HTML
- Render available times and enable booking confirmation

---

## 🔍 Note

Ensure your antivirus or firewall is not blocking local file creation or auto-deleting any key components like `CalendarPicker.jsx`.

---

## 📄 License

MIT License – for development and educational use only at this stage.
