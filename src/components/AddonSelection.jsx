import React from 'react';

const AddonSelection = ({
  currentShiftAddons,
  currentShiftUsagePolicy,
  selectedAddons,
  onAddonChange, // This will be implemented in ReservationForm.jsx later
  guestCount,
  currencySymbol,
  languageStrings // For labels like "Quantity" or other addon related texts
}) => {

  if (!currentShiftAddons || currentShiftAddons.length === 0 || currentShiftUsagePolicy === null) {
    return null; // Don't render anything if no addons or policy
  }

  // Filter addons based on guest count (min/max covers)
  const numericGuestCount = parseInt(guestCount, 10) || 0;
  const filteredAddons = currentShiftAddons.filter(addon => {
    const minCovers = (typeof addon.min === 'number' && !isNaN(addon.min)) ? addon.min : 1;
    const maxCovers = (typeof addon.max === 'number' && !isNaN(addon.max)) ? addon.max : Infinity;
    return numericGuestCount >= minCovers && numericGuestCount <= maxCovers;
  });

  if (filteredAddons.length === 0 && numericGuestCount > 0) { // numericGuestCount > 0 ensures we don't show this before guests are selected
    return (
      <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 text-yellow-700 rounded-md">
        <p>{languageStrings?.noAddonsAvailableGuests || 'No addons currently available for the selected number of guests.'}</p>
      </div>
    );
  }

  if (filteredAddons.length === 0) { // General case if no addons passed filtering for other reasons
      return null;
  }

  const getAddonPriceString = (addon) => {
    if (typeof addon.price !== 'number' || addon.price < 0) return ''; // No price or invalid price

    const displaySymbol = currencySymbol || '$';
    const priceInDollars = (addon.price / 100).toFixed(2);
    let priceString = `${displaySymbol}${priceInDollars}`;

    if (addon.price === 0 && !(addon.per === "Guest")) { // For free items not per guest, just show free or no price string
        return languageStrings?.free || "Free"; // Or return "" if you don't want to show "Free"
    }

    if (addon.per === 'Guest') {
      priceString += ` ${languageStrings?.perPerson || 'per Person'}`;
    } else if (addon.per) { // Could be "Item", "Party", etc.
      priceString += ` ${languageStrings?.per || 'per'} ${addon.per}`;
    } else { // Default if addon.per is undefined or null
      priceString += ` ${languageStrings?.perItem || 'per Item'}`;
    }
    return priceString;
  };

  const renderUsagePolicy1 = () => {
    if (filteredAddons.length === 1) {
      // Single addon: render as a single checkbox
      const addon = filteredAddons[0];
      const isChecked = selectedAddons.usage1 && selectedAddons.usage1.uid === addon.uid;
      return (
        <div className="addon-item usage1-single p-2 border rounded-md hover:bg-gray-50 transition-colors">
          <label htmlFor={`addon-${addon.uid}`} className="flex items-center space-x-3 cursor-pointer">
            <input
              type="checkbox"
              id={`addon-${addon.uid}`}
              value={addon.uid}
              checked={isChecked}
              onChange={(e) => onAddonChange('usage1', addon, e.target.checked)}
              className="form-checkbox h-5 w-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
              data-addon-uid={addon.uid}
              data-addon-name={addon.name}
              data-addon-price={addon.price}
              data-addon-desc={addon.desc}
              data-addon-per={addon.per}
              data-addon-type={addon.type}
            />
            <div className="flex-grow">
              <span className="addon-name font-medium text-gray-800">{addon.name}</span>
              {addon.price >= 0 && <span className="addon-price text-sm text-gray-600 ml-2">({getAddonPriceString(addon)})</span>}
              {addon.desc && <p className="text-xs text-gray-500 mt-1">{addon.desc}</p>}
            </div>
          </label>
        </div>
      );
    } else {
      // Multiple addons: render as radio buttons
      return (
        <div className="addon-radio-group space-y-2">
          {filteredAddons.map(addon => {
            const isChecked = selectedAddons.usage1 && selectedAddons.usage1.uid === addon.uid;
            return (
              <div key={addon.uid} className="addon-item usage1-radio p-2 border rounded-md hover:bg-gray-50 transition-colors">
                <label htmlFor={`addon-${addon.uid}`} className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="radio"
                    id={`addon-${addon.uid}`}
                    name="usage1_addons"
                    value={addon.uid}
                    checked={isChecked}
                    onChange={(e) => onAddonChange('usage1', addon, e.target.checked)}
                    className="form-radio h-5 w-5 text-blue-600 border-gray-300 focus:ring-blue-500"
                    data-addon-uid={addon.uid}
                    data-addon-name={addon.name}
                    data-addon-price={addon.price}
                    data-addon-desc={addon.desc}
                    data-addon-per={addon.per}
                    data-addon-type={addon.type}
                  />
                  <div className="flex-grow">
                    <span className="addon-name font-medium text-gray-800">{addon.name}</span>
                    {addon.price >= 0 && <span className="addon-price text-sm text-gray-600 ml-2">({getAddonPriceString(addon)})</span>}
                    {addon.desc && <p className="text-xs text-gray-500 mt-1">{addon.desc}</p>}
                  </div>
                </label>
              </div>
            );
          })}
        </div>
      );
    }
  };

  const renderUsagePolicy2 = () => {
    const totalUsage2Quantity = selectedAddons.usage2.reduce((sum, item) => sum + item.quantity, 0);
    const maxTotalQuantity = numericGuestCount > 0 ? numericGuestCount : (filteredAddons.length > 0 ? 1 : 0); // Fallback if guest count is 0 but addons exist

    return (
      <div className="space-y-3">
        {filteredAddons.map(addon => {
          const selectedItem = selectedAddons.usage2.find(item => item.uid === addon.uid);
          const currentQuantity = selectedItem ? selectedItem.quantity : 0;
          const canIncrement = numericGuestCount === 0 || totalUsage2Quantity < maxTotalQuantity; // Allow increment if guest count is 0 (treat as fixed item) or total is less than guests

          return (
            <div key={addon.uid} className="addon-item usage2-item p-3 border rounded-md flex flex-col sm:flex-row justify-between items-start sm:items-center hover:bg-gray-50 transition-colors">
              <div className="addon-info mb-2 sm:mb-0 sm:mr-4 flex-grow">
                <span className="addon-name font-medium text-gray-800">{addon.name}</span>
                {addon.price >= 0 && <span className="addon-price text-sm text-gray-600 ml-2">({getAddonPriceString(addon)})</span>}
                {addon.desc && <p className="text-xs text-gray-500 mt-1">{addon.desc}</p>}
              </div>
              <div className="addon-quantity-selector flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => onAddonChange('usage2', addon, currentQuantity - 1)}
                  disabled={currentQuantity === 0}
                  className="qty-btn minus-btn px-3 py-1 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  -
                </button>
                <input
                  type="text"
                  className="qty-input w-12 text-center border-gray-300 rounded-md shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                  value={currentQuantity}
                  readOnly
                  data-addon-uid={addon.uid}
                />
                <button
                  type="button"
                  onClick={() => onAddonChange('usage2', addon, currentQuantity + 1)}
                  disabled={!canIncrement && numericGuestCount > 0} // Only disable based on guest count if guest count is a factor
                  className="qty-btn plus-btn px-3 py-1 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  +
                </button>
              </div>
            </div>
          );
        })}
        {numericGuestCount > 0 && (filteredAddons.some(a => a.per === 'Guest') || currentShiftUsagePolicy === 2) && (
             <p className="text-xs text-gray-500 mt-2">
                {languageStrings?.addonPolicy2Note || `Total quantity for these items cannot exceed ${languageStrings?.guest?.toLowerCase() || 'guest'} count (${maxTotalQuantity}).`}
             </p>
        )}
      </div>
    );
  };

  const renderUsagePolicy3Or0 = () => {
    return (
      <div className="space-y-2">
        {filteredAddons.map(addon => {
          const isChecked = selectedAddons.usage3.some(item => item.uid === addon.uid);
          return (
            <div key={addon.uid} className="addon-item usage3-item p-2 border rounded-md hover:bg-gray-50 transition-colors">
              <label htmlFor={`addon-${addon.uid}`} className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  id={`addon-${addon.uid}`}
                  value={addon.uid}
                  checked={isChecked}
                  onChange={(e) => onAddonChange('usage3', addon, e.target.checked)}
                  className="form-checkbox h-5 w-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                  data-addon-uid={addon.uid}
                  data-addon-name={addon.name}
                  data-addon-price={addon.price}
                  data-addon-desc={addon.desc}
                  data-addon-per={addon.per}
                  data-addon-type={addon.type}
                />
                <div className="flex-grow">
                  <span className="addon-name font-medium text-gray-800">{addon.name}</span>
                  {addon.price >= 0 && <span className="addon-price text-sm text-gray-600 ml-2">({getAddonPriceString(addon)})</span>}
                  {addon.desc && <p className="text-xs text-gray-500 mt-1">{addon.desc}</p>}
                </div>
              </label>
            </div>
          );
        })}
      </div>
    );
  };

  let content;
  switch (currentShiftUsagePolicy) {
    case 1:
      content = renderUsagePolicy1();
      break;
    case 2:
      content = renderUsagePolicy2();
      break;
    case 3:
      content = renderUsagePolicy3Or0();
      break;
    case 0: // Default/Generic
    default:
      content = renderUsagePolicy3Or0(); // Same as usage 3 according to README
      break;
  }

  return (
    <div className="mt-6 p-4 border border-gray-200 rounded-lg shadow bg-white">
      <h4 className="text-lg font-semibold text-gray-700 mb-3">
        {languageStrings?.availableAddons || 'Available Addons'}
      </h4>
      {content}
    </div>
  );
};

export default AddonSelection;
