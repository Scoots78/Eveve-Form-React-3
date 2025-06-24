import React from 'react';

const AddonSelection = ({
  currentShiftAddons,
  currentShiftUsagePolicy,
  selectedAddons,
  onAddonChange, // This will be implemented in ReservationForm.jsx later
  guestCount,
  currencySymbol,
  languageStrings, // For labels like "Quantity" or other addon related texts
  selectedShiftTime // Needed for shift.maxMenuTypes
}) => {

  const numericGuestCount = parseInt(guestCount, 10) || 0;

  // 1. Separate addons by type
  const menuAddonsFromShift = currentShiftAddons.filter(addon => addon.type === "Menu");
  const optionAddonsFromShift = currentShiftAddons.filter(addon => addon.type === "Option");

  // 2. Apply global guest count filtering for visibility
  const filterByGuestCount = (addon) => {
    if (numericGuestCount === 0) return true; // Show all if guest count is 0, specific limits apply later
    const minGuests = (typeof addon.min === 'number' && !isNaN(addon.min)) ? addon.min : 1;
    const maxGuests = (typeof addon.max === 'number' && !isNaN(addon.max)) ? addon.max : Infinity;
    return numericGuestCount >= minGuests && numericGuestCount <= maxGuests;
  };

  const finalMenuAddons = menuAddonsFromShift.filter(filterByGuestCount);
  const finalOptionAddons = optionAddonsFromShift.filter(filterByGuestCount);

  // Determine if there's anything to render for menus based on usage policy
  const shouldRenderMenus = !(currentShiftUsagePolicy === 0 && finalMenuAddons.length > 0);


  // Early exit if nothing to display
  // Options visibility also depends on parent linking, which is handled during their rendering.
  // So, we check if there are potential menus (unless usage is 0) or potential options.
  if ((!shouldRenderMenus || finalMenuAddons.length === 0) && finalOptionAddons.length === 0) {
    if (numericGuestCount > 0 && currentShiftAddons.length > 0) { // Only show this if addons existed before filtering
       return (
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 text-yellow-700 rounded-md">
          <p>{languageStrings?.noAddonsAvailableGuests || 'No addons currently available for the selected number of guests.'}</p>
        </div>
      );
    }
    return null; // Nothing to render at all
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

  // --- Render Menu Addons ---
  const renderMenuAddons = () => {
    if (!shouldRenderMenus || finalMenuAddons.length === 0) {
      if (currentShiftUsagePolicy !== 0 && numericGuestCount > 0 && menuAddonsFromShift.length > 0) {
        // This case means menus would normally be shown, but none are available after guest filtering for this specific guest count
        return (
          <div className="mb-4">
            <h5 className="text-md font-semibold text-gray-600 mb-1">
              {languageStrings?.menusTitle || 'Menus'}
            </h5>
            <p className="text-sm text-gray-500 italic">
              {languageStrings?.noMenusAvailableGuests || 'No menus available for the current guest count.'}
            </p>
          </div>
        );
      }
      return null; // No menus to render or usage is 0
    }

    let menuContent;
    const commonMenuChangeHandler = (addon, value, typeOverride = null) => {
      // 'typeOverride' can be 'radio', 'checkbox', 'quantity' to guide handler
      const eventType = typeOverride || (currentShiftUsagePolicy === 1 ? 'radio' : (currentShiftUsagePolicy === 3 ? 'checkbox' : 'quantity'));
      onAddonChange('menu', addon, value, eventType, currentShiftUsagePolicy);
    };


    switch (currentShiftUsagePolicy) {
      case 0: // No menu required - hide all Menu addons
        return (
            <div className="mb-4">
                <h5 className="text-md font-semibold text-gray-600 mb-1">
                    {languageStrings?.menusTitle || 'Menus'}
                </h5>
                <p className="text-sm text-gray-500 italic">{languageStrings?.noMenuRequired || 'No menu selection is required for this time.'}</p>
            </div>
        );

      case 1: // Radio buttons for Menus
        menuContent = (
          <div className="addon-radio-group space-y-2">
            {finalMenuAddons.map(addon => {
              const isChecked = selectedAddons.menus.length > 0 && selectedAddons.menus[0].uid === addon.uid;
              return (
                <div key={addon.uid} className="addon-item usage1-radio p-2 border rounded-md hover:bg-gray-50 transition-colors">
                  <label htmlFor={`menu-${addon.uid}`} className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="radio"
                      id={`menu-${addon.uid}`}
                      name="menu_addons_usage1"
                      value={addon.uid}
                      checked={isChecked}
                      onChange={(e) => commonMenuChangeHandler(addon, e.target.checked, 'radio')}
                      className="form-radio h-5 w-5 text-blue-600 border-gray-300 focus:ring-blue-500"
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
        break;

      case 2: // Quantity selectors for Menus
        menuContent = (
          <div className="space-y-3">
            {finalMenuAddons.map(addon => {
              const selectedMenu = selectedAddons.menus.find(m => m.uid === addon.uid);
              const currentQuantity = selectedMenu ? selectedMenu.quantity : 0;
              // Note: Min/max for menu quantity not defined in new spec, assuming no hard limit other than reasonable UI.
              // The addon's own min/max are for guest count visibility.
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
                      onClick={() => commonMenuChangeHandler(addon, currentQuantity - 1, 'quantity')}
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
                    />
                    <button
                      type="button"
                      onClick={() => commonMenuChangeHandler(addon, currentQuantity + 1, 'quantity')}
                      // No explicit upper limit mentioned for menu quantities in new spec for usage:2
                      className="qty-btn plus-btn px-3 py-1 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
                    >
                      +
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        );
        break;

      case 3: // Checkboxes for Menus
        const maxSelections = selectedShiftTime?.maxMenuTypes > 0 ? selectedShiftTime.maxMenuTypes : numericGuestCount > 0 ? numericGuestCount : (finalMenuAddons.length > 0 ? 1: 0) ;
        const currentSelectionsCount = selectedAddons.menus.length;
        const canSelectMoreMenus = currentSelectionsCount < maxSelections;

        menuContent = (
          <div className="space-y-2">
            {finalMenuAddons.map(addon => {
              const isChecked = selectedAddons.menus.some(m => m.uid === addon.uid);
              const isDisabled = !isChecked && !canSelectMoreMenus;
              return (
                <div key={addon.uid} className={`addon-item usage3-item p-2 border rounded-md hover:bg-gray-50 transition-colors ${isDisabled ? 'opacity-60 cursor-not-allowed' : ''}`}>
                  <label htmlFor={`menu-${addon.uid}`} className={`flex items-center space-x-3 ${isDisabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                    <input
                      type="checkbox"
                      id={`menu-${addon.uid}`}
                      value={addon.uid}
                      checked={isChecked}
                      disabled={isDisabled}
                      onChange={(e) => commonMenuChangeHandler(addon, e.target.checked, 'checkbox')}
                      className="form-checkbox h-5 w-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
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
            {maxSelections > 0 && maxSelections < Infinity && (
              <p className="text-xs text-gray-500 mt-1">
                {languageStrings?.maxMenuSelectionNote || `Select up to ${maxSelections} menu(s).`} ({currentSelectionsCount}/{maxSelections} selected)
              </p>
            )}
          </div>
        );
        break;
      default: // Should ideally not happen if currentShiftUsagePolicy is validated upstream
        menuContent = <p className="text-sm text-red-500">{languageStrings?.invalidMenuUsage || 'Invalid menu configuration.'}</p>;
    }

    return (
      <div className="mb-6">
        <h4 className="text-lg font-semibold text-gray-700 mb-3">
          {languageStrings?.menusTitle || 'Menus'}
        </h4>
        {menuContent}
      </div>
    );
  };


  // --- Render Option Addons ---
  const renderOptionAddons = () => {
    const visibleOptions = finalOptionAddons.filter(option => {
      if (option.parent === -1) {
        return true; // Always valid if guest count is in range (already filtered by finalOptionAddons)
      }
      // Check if the parent menu (by originalIndex) is selected
      return selectedAddons.menus.some(selectedMenu => selectedMenu.originalIndex === option.parent);
    });

    if (visibleOptions.length === 0) {
      // Show message if options exist but none are visible due to parent linking or if all options were filtered by guest count initially
      if (finalOptionAddons.length > 0 || (optionAddonsFromShift.length > 0 && numericGuestCount > 0)) {
         return (
            <div className="mt-4">
                <h4 className="text-lg font-semibold text-gray-700 mb-3 border-t pt-4 mt-4">
                    {languageStrings?.optionsTitle || 'Optional Add-ons'}
                </h4>
                <p className="text-sm text-gray-500 italic">
                    {selectedAddons.menus.length === 0 && currentShiftUsagePolicy !==0 && finalMenuAddons.length > 0 && optionAddonsFromShift.some(o => o.parent !== -1) ?
                     (languageStrings?.selectMenuForOptions || 'Please select a menu to see available options.') :
                     (languageStrings?.noOptionsAvailable || 'No optional add-ons currently available.')}
                </p>
            </div>
         );
      }
      return null; // No options to render at all
    }

    const commonOptionChangeHandler = (addon, newQuantity) => {
      onAddonChange('option', addon, newQuantity);
    };

    return (
      <div className="mt-4">
        <h4 className="text-lg font-semibold text-gray-700 mb-3 border-t pt-4 mt-4">
          {languageStrings?.optionsTitle || 'Optional Add-ons'}
        </h4>
        <div className="space-y-3">
          {visibleOptions.map(addon => {
            const currentQuantity = selectedAddons.options[addon.uid] || 0;

            // Quantity constraints for options:
            // 1. Between addon's own min & max (these are quantity bounds for options)
            // 2. Not exceeding guestCount
            const optionMinQty = (typeof addon.min === 'number' && !isNaN(addon.min)) ? addon.min : 0; // Default min quantity is 0 if not specified
            const optionMaxQty = (typeof addon.max === 'number' && !isNaN(addon.max)) ? addon.max : Infinity; // Default max quantity is Infinity

            const maxAllowedByGuestCount = numericGuestCount > 0 ? numericGuestCount : Infinity; // If no guests, no limit based on guests

            const effectiveMaxQty = Math.min(optionMaxQty, maxAllowedByGuestCount);

            const canIncrement = currentQuantity < effectiveMaxQty;
            const canDecrement = currentQuantity > 0 && currentQuantity > optionMinQty; // Can only decrement if current > 0 and current > defined min for option

            return (
              <div key={addon.uid} className="addon-item option-item p-3 border rounded-md flex flex-col sm:flex-row justify-between items-start sm:items-center hover:bg-gray-50 transition-colors">
                <div className="addon-info mb-2 sm:mb-0 sm:mr-4 flex-grow">
                  <span className="addon-name font-medium text-gray-800">{addon.name}</span>
                  {addon.price >= 0 && <span className="addon-price text-sm text-gray-600 ml-2">({getAddonPriceString(addon)})</span>}
                  {addon.desc && <p className="text-xs text-gray-500 mt-1">{addon.desc}</p>}
                </div>
                <div className="addon-quantity-selector flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => commonOptionChangeHandler(addon, currentQuantity - 1)}
                    disabled={!canDecrement}
                    className="qty-btn minus-btn px-3 py-1 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    -
                  </button>
                  <input
                    type="text"
                    className="qty-input w-12 text-center border-gray-300 rounded-md shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                    value={currentQuantity}
                    readOnly
                  />
                  <button
                    type="button"
                    onClick={() => commonOptionChangeHandler(addon, currentQuantity + 1)}
                    disabled={!canIncrement}
                    className="qty-btn plus-btn px-3 py-1 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>
            );
          })}
           {/* Helper text for option quantity rules if needed */}
           {visibleOptions.length > 0 && (
            <p className="text-xs text-gray-500 mt-1">
              {languageStrings?.optionQuantityNote || `Quantities for options are per item and cannot exceed guest count. Each option may also have its own min/max quantity limits.`}
            </p>
           )}
        </div>
      </div>
    );
  };


  return (
    <div className="mt-6 p-4 border border-gray-200 rounded-lg shadow bg-white">
      {renderMenuAddons()}
      {renderOptionAddons()}
    </div>
  );
};

export default AddonSelection;
