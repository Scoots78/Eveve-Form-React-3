import React, { useState, useEffect } from "react";

// Guest Selector Component (basic buttons for now)
const GuestSelector = ({ guests, setGuests }) => {
  const increment = () => setGuests(prev => Math.min(prev + 1, 20));
  const decrement = () => setGuests(prev => Math.max(prev - 1, 1));
  const handleChange = (e) => {
    const val = parseInt(e.target.value, 10);
    if (!isNaN(val)) setGuests(Math.min(Math.max(val, 1), 20));
  };

  return (
    <div className="flex items-center space-x-2 mt-4">
      <label className="font-semibold">Guests:</label>
      <button className="px-2 py-1 bg-gray-200 rounded" onClick={decrement}>-</button>
      <input
        type="number"
        min="1"
        max="20"
        value={guests}
        onChange={handleChange}
        className="w-12 text-center border border-gray-300 rounded"
      />
      <button className="px-2 py-1 bg-gray-200 rounded" onClick={increment}>+</button>
    </div>
  );
};

export default function ReservationForm() {
  const urlParams = new URLSearchParams(window.location.search);
  const est = urlParams.get("est") || "testnza"; // fallback

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [guests, setGuests] = useState(2);

  /*useEffect(() => {
    const fetchEveveConfig = async () => {
      try {
        const response = await fetch(`https://nz6.eveve.com/web/form?est=${est}`);
        const htmlText = await response.text();

        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlText, "text/html");

        // Extract all <script> tags (you can later refine to parse JSON or config vars)
        const scripts = Array.from(doc.querySelectorAll("script"));
        const allScriptText = scripts.map(s => s.textContent).join("\n");

        console.log("🎯 Eveve script content:");
        console.log(allScriptText);

        // You could now search for specific variables using regex if needed
      } catch (error) {
        console.error("Error fetching/parsing Eveve config:", error);
      }
    };*/

    fetchEveveConfig();
  }, [est]);

  return (
    <div className="p-4 max-w-lg mx-auto">
      <h2 className="text-2xl font-bold mb-4">Book a Table</h2>

      {/* Date display */}
      <div className="mb-4">
        <label className="block mb-1 font-medium">Date</label>
        <input
          type="text"
          value={selectedDate.toLocaleDateString(undefined, {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
          readOnly
          className="border px-3 py-2 rounded w-full bg-gray-100"
        />
      </div>

      {/* Guest Selector */}
      <GuestSelector guests={guests} setGuests={setGuests} />
    </div>
  );
}
