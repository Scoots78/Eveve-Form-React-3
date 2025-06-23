import React from 'react';

export default function GuestSelector({ value, onChange }) {
  const currentGuests = typeof value === 'number' ? value : '';

  const handleIncrement = () => {
    const newValue = (typeof value === 'number' ? value : 0) + 1;
    onChange(Math.min(newValue, 20));
  };

  const handleDecrement = () => {
    if (typeof value === 'number' && value > 1) {
      onChange(Math.max(value - 1, 1));
    } else if (typeof value !== 'number' || value <=1) {
      // Allows decrementing to empty/placeholder if not already at 1
      // or if current value is not a number
      onChange(''); // Or trigger placeholder state
    }
  };

  const handleChange = (e) => {
    const inputValue = e.target.value;
    if (inputValue === '') {
      onChange(''); // Set to empty to show placeholder
    } else {
      const numValue = parseInt(inputValue, 10);
      if (!isNaN(numValue) && numValue >= 1 && numValue <= 20) {
        onChange(numValue);
      } else if (!isNaN(numValue) && numValue < 1) {
        onChange(1); // Or set to empty: onChange('');
      } else if (!isNaN(numValue) && numValue > 20) {
        onChange(20);
      }
      // If not a valid number, do nothing to allow typing, or reset to ''
    }
  };

  return (
    <div className="mt-4">
      <label htmlFor="guests-input" className="block text-sm font-medium text-gray-700 mb-1">
        Number of Guests
      </label>
      <div className="flex items-center space-x-2">
        <button
          type="button"
          onClick={handleDecrement}
          className="px-3 py-1 rounded-md bg-gray-200 text-gray-800 hover:bg-gray-300"
          disabled={value === 1} // Disable decrement if at 1
        >
          –
        </button>
        <input
          type="text" // Changed to text to allow "How many guests?" placeholder logic
          id="guests-input"
          name="guests"
          value={currentGuests}
          onChange={handleChange}
          placeholder="How many guests?"
          className="w-24 text-center border rounded-md py-1"
          min="1" // Min/max are for guidance, actual validation is in JS
          max="20"
        />
        <button
          type="button"
          onClick={handleIncrement}
          className="px-3 py-1 rounded-md bg-gray-200 text-gray-800 hover:bg-gray-300"
          disabled={value === 20} // Disable increment if at 20
        >
          +
        </button>
      </div>
    </div>
  );
}
