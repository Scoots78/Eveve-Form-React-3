import React from 'react';

export default function GuestSelector({
  value,
  onChange,
  minGuests = 1,
  maxGuests = 20,
  guestLabel = "Number of Guests", // Default label
  guestsLabel // For placeholder, could be like "Select guests" or from config
}) {
  const currentGuests = typeof value === 'number' ? value : '';
  const effectiveMinGuests = Number(minGuests) || 1;
  const effectiveMaxGuests = Number(maxGuests) || 20;

  const handleIncrement = () => {
    const numericValue = (typeof value === 'number' ? value : 0);
    // If current value is empty string (placeholder), start increment from minGuests or 1 if minGuests is 0
    // However, typically minGuests will be >= 1.
    // If value is 0 (or less than minGuests) due to direct input or initial state, increment should go to minGuests.
    let newValue;
    if (numericValue < effectiveMinGuests) {
        newValue = effectiveMinGuests;
    } else {
        newValue = numericValue + 1;
    }
    onChange(Math.min(newValue, effectiveMaxGuests));
  };

  const handleDecrement = () => {
    // Allow decrementing to empty string (placeholder) if current value is at minGuests
    if (typeof value === 'number' && value > effectiveMinGuests) {
      onChange(Math.max(value - 1, effectiveMinGuests));
    } else if (value === effectiveMinGuests || typeof value !== 'number') {
      // If at minGuests, or if current value is not a number (e.g. placeholder is shown)
      // decrementing should clear it to show placeholder.
      onChange('');
    }
    // If value is somehow below minGuests (e.g. initial state before config load),
    // and decrement is hit, it should also ideally go to placeholder.
  };

  const handleChange = (e) => {
    const inputValue = e.target.value;
    if (inputValue === '') {
      onChange(''); // Set to empty to show placeholder
    } else {
      const numValue = parseInt(inputValue, 10);
      if (!isNaN(numValue)) {
        if (numValue >= effectiveMinGuests && numValue <= effectiveMaxGuests) {
          onChange(numValue);
        } else if (numValue < effectiveMinGuests) {
          onChange(effectiveMinGuests); // Snap to min
        } else if (numValue > effectiveMaxGuests) {
          onChange(effectiveMaxGuests); // Snap to max
        }
      }
      // If not a valid number (e.g. "abc"), do nothing to allow user to continue typing or clear
    }
  };

  const placeholderText = guestsLabel || `Select ${guestLabel.toLowerCase()}`;

  return (
    <div className="mt-4">
      <label htmlFor="guests-input" className="block text-sm font-medium text-gray-700 mb-1">
        {guestLabel}
      </label>
      <div className="flex items-center space-x-2">
        <button
          type="button"
          onClick={handleDecrement}
          className="px-3 py-1 rounded-md bg-gray-200 text-gray-800 hover:bg-gray-300 disabled:opacity-50"
          // Disable if value is already at minGuests or if it's empty (placeholder shown)
          // and minGuests is 1 (or more, meaning can't go lower than a number)
          disabled={(typeof value === 'number' && value <= effectiveMinGuests) || (value === '' && effectiveMinGuests > 0) }
        >
          –
        </button>
        <input
          type="text"
          id="guests-input"
          name="guests"
          value={currentGuests}
          onChange={handleChange}
          placeholder={placeholderText}
          className="w-24 text-center border rounded-md py-1"
          // HTML min/max are for browser hints, JS logic enforces strict limits
          min={effectiveMinGuests}
          max={effectiveMaxGuests}
        />
        <button
          type="button"
          onClick={handleIncrement}
          className="px-3 py-1 rounded-md bg-gray-200 text-gray-800 hover:bg-gray-300 disabled:opacity-50"
          disabled={typeof value === 'number' && value >= effectiveMaxGuests}
        >
          +
        </button>
      </div>
    </div>
  );
}
