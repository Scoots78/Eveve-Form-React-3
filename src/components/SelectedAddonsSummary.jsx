import React from 'react';

const SelectedAddonsSummary = ({ selectedAddons, currencySymbol, languageStrings, guestCount }) => {
  const numericGuestCount = parseInt(guestCount, 10) || 1; // Default to 1 if guestCount is not valid, for per-guest calculation

  const formatPrice = (price) => {
    if (typeof price !== 'number') return '';
    return `${currencySymbol || '$'}${(price / 100).toFixed(2)}`;
  };

  const items = [];
  let totalAddonCost = 0;

  // Usage 1
  if (selectedAddons.usage1) {
    const addon = selectedAddons.usage1;
    let price = addon.price;
    if (addon.per === 'Guest') {
      price *= numericGuestCount;
    }
    items.push(`${addon.name} (${formatPrice(price)})`);
    totalAddonCost += price;
  }

  // Usage 2
  selectedAddons.usage2.forEach(addon => {
    let price = addon.price;
    // For usage 2, price is typically per item, not per guest, quantity handles multiples.
    // If addon.per === 'Guest' AND it's a usage 2 item, this means each *unit* is per guest, which is unusual.
    // The README implies price is per item and quantity is selected.
    // Let's assume price is for one unit of the addon.
    const itemTotalCost = price * addon.quantity;
    items.push(`${addon.name} x${addon.quantity} (${formatPrice(itemTotalCost)})`);
    totalAddonCost += itemTotalCost;
  });

  // Usage 3 (and 0)
  selectedAddons.usage3.forEach(addon => {
    let price = addon.price;
    if (addon.per === 'Guest') {
      price *= numericGuestCount;
    }
    items.push(`${addon.name} (${formatPrice(price)})`);
    totalAddonCost += price;
  });

  if (items.length === 0) {
    return null; // Don't render if no addons are selected
  }

  return (
    <div className="mt-6 p-4 border border-blue-200 rounded-lg shadow bg-blue-50">
      <h5 className="text-md font-semibold text-blue-700 mb-2">
        {languageStrings?.selectedAddonsSummaryTitle || 'Selected Addons Summary'}
      </h5>
      {items.length > 0 ? (
        <>
          <ul className="list-disc list-inside space-y-1 text-sm text-blue-600">
            {items.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
          <p className="mt-3 text-sm font-semibold text-blue-700">
            {languageStrings?.totalAddonCostLabel || 'Total Addon Cost'}: {formatPrice(totalAddonCost)}
          </p>
        </>
      ) : (
        <p className="text-sm text-gray-500 italic">
          {languageStrings?.noAddonsSelected || 'No addons selected.'}
        </p>
      )}
    </div>
  );
};

export default SelectedAddonsSummary;
