import React from 'react';

export default function GuestSelector({ covers, setCovers }) {
  const increment = () => {
    if (covers < 20) setCovers(covers + 1);
  };

  const decrement = () => {
    if (covers > 1) setCovers(covers - 1);
  };

  const handleChange = (e) => {
    const value = parseInt(e.target.value, 10);
    if (!isNaN(value) && value >= 1 && value <= 20) {
      setCovers(value);
    } else if (e.target.value === '') {
      setCovers('');
    }
  };

  return (
    <div className="mt-4">
      <label htmlFor="covers" className="block text-sm font-medium text-gray-700 mb-1">
        Number of Guests
      </label>
      <div className="flex items-center space-x-2">
        <button
          type="button"
          onClick={decrement}
          className="px-3 py-1 rounded-md bg-gray-200 text-gray-800 hover:bg-gray-300"
        >
          –
        </button>
        <input
          type="number"
          id="covers"
          name="covers"
          value={covers}
          onChange={handleChange}
          className="w-16 text-center border rounded-md py-1"
          min="1"
          max="20"
        />
        <button
          type="button"
          onClick={increment}
          className="px-3 py-1 rounded-md bg-gray-200 text-gray-800 hover:bg-gray-300"
        >
          +
        </button>
      </div>
    </div>
  );
}
