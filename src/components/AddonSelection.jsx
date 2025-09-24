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
        <div className="mt-4 p-3 bg-warning/10 border border-warning text-warning rounded-md">
          <p>{languageStrings?.noAddonsAvailableGuests || 'No addons currently available for the selected number of guests.'}</p>
        </div>
      );
    }
    return null; // Nothing to render at all
  }


  const getAddonPriceString = (addon) => {
    // Hide price display when zero or invalid
    if (typeof addon.price !== 'number' || addon.price <= 0) return '';

    const displaySymbol = currencySymbol || '$';
    const priceInDollars = (addon.price / 100).toFixed(2);
    let priceString = `${displaySymbol}${priceInDollars}`;

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
        <div className="addon-item usage1-single p-2 border rounded-md hover:bg-base-300 transition-colors">
          <label htmlFor={`addon-${addon.uid}`} className="flex items-center space-x-3 cursor-pointer">
            <input
              type="checkbox"
              id={`addon-${addon.uid}`}
              value={addon.uid}
              checked={isChecked}
              onChange={(e) => onAddonChange('usage1', addon, e.target.checked)}
              className="form-checkbox h-5 w-5 text-primary rounded border-base-300 focus:ring-primary"
              data-addon-uid={addon.uid}
              data-addon-name={addon.name}
              data-addon-price={addon.price}
              data-addon-desc={addon.desc}
              data-addon-per={addon.per}
              data-addon-type={addon.type}
            />
            <div className="flex-grow">
              <span className="addon-name font-medium text-base-content">{addon.name}</span>
              {(() => { const ps = getAddonPriceString(addon); return ps ? (<span className="addon-price text-sm text-base-content/70 ml-2">({ps})</span>) : null; })()}
              {addon.desc && <p className="text-xs text-base-content/60 mt-1">{addon.desc}</p>}
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
              <div key={addon.uid} className="addon-item usage1-radio p-2 border rounded-md hover:bg-base-300 transition-colors">
                <label htmlFor={`addon-${addon.uid}`} className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="radio"
                    id={`addon-${addon.uid}`}
                    name="usage1_addons"
                    value={addon.uid}
                    checked={isChecked}
                    onChange={(e) => onAddonChange('usage1', addon, e.target.checked)}
                    className="form-radio h-5 w-5 text-primary border-base-300 focus:ring-primary"
                    data-addon-uid={addon.uid}
                    data-addon-name={addon.name}
                    data-addon-price={addon.price}
                    data-addon-desc={addon.desc}
                    data-addon-per={addon.per}
                    data-addon-type={addon.type}
                  />
                  <div className="flex-grow">
                    <span className="addon-name font-medium text-base-content">{addon.name}</span>
                    {(() => { const ps = getAddonPriceString(addon); return ps ? (<span className="addon-price text-sm text-base-content/70 ml-2">({ps})</span>) : null; })()}
                    {addon.desc && <p className="text-xs text-base-content/60 mt-1">{addon.desc}</p>}
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
            <div key={addon.uid} className="addon-item usage2-item p-3 border rounded-md flex flex-col sm:flex-row justify-between items-start sm:items-center hover:bg-base-300 transition-colors">
              <div className="addon-info mb-2 sm:mb-0 sm:mr-4 flex-grow">
                <span className="addon-name font-medium text-base-content">{addon.name}</span>
                {(() => { const ps = getAddonPriceString(addon); return ps ? (<span className="addon-price text-sm text-base-content/70 ml-2">({ps})</span>) : null; })()}
                {addon.desc && <p className="text-xs text-base-content/60 mt-1">{addon.desc}</p>}
              </div>
              <div className="addon-quantity-selector flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => onAddonChange('usage2', addon, currentQuantity - 1)}
                  disabled={currentQuantity === 0}
                  className="qty-btn minus-btn px-3 py-1 bg-base-200 text-base-content rounded-md hover:bg-base-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  -
                </button>
                <input
                  type="text"
                  className="qty-input w-12 text-center border-base-300 rounded-md shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
                  value={currentQuantity}
                  readOnly
                  data-addon-uid={addon.uid}
                />
                <button
                  type="button"
                  onClick={() => onAddonChange('usage2', addon, currentQuantity + 1)}
                  disabled={!canIncrement && numericGuestCount > 0} // Only disable based on guest count if guest count is a factor
                  className="qty-btn plus-btn px-3 py-1 bg-base-200 text-base-content rounded-md hover:bg-base-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  +
                </button>
              </div>
            </div>
          );
        })}
        {numericGuestCount > 0 && (filteredAddons.some(a => a.per === 'Guest') || currentShiftUsagePolicy === 2) && (
             <p className="text-xs text-base-content/60 mt-2">
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
            <div key={addon.uid} className="addon-item usage3-item p-2 border rounded-md hover:bg-base-300 transition-colors">
              <label htmlFor={`addon-${addon.uid}`} className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  id={`addon-${addon.uid}`}
                  value={addon.uid}
                  checked={isChecked}
                  onChange={(e) => onAddonChange('usage3', addon, e.target.checked)}
                  className="form-checkbox h-5 w-5 text-primary rounded border-base-300 focus:ring-primary"
                  data-addon-uid={addon.uid}
                  data-addon-name={addon.name}
                  data-addon-price={addon.price}
                  data-addon-desc={addon.desc}
                  data-addon-per={addon.per}
                  data-addon-type={addon.type}
                />
                <div className="flex-grow">
                  <span className="addon-name font-medium text-base-content">{addon.name}</span>
                {(() => { const ps = getAddonPriceString(addon); return ps ? (<span className="addon-price text-sm text-base-content/70 ml-2">({ps})</span>) : null; })()}
                  {addon.desc && <p className="text-xs text-base-content/60 mt-1">{addon.desc}</p>}
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
            <h5 className="text-md font-semibold text-base-content mb-1">
              {languageStrings?.menusTitle || 'Menus'}
            </h5>
            <p className="text-sm text-base-content/60 italic">
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
                <h5 className="text-md font-semibold text-base-content mb-1">
                    {languageStrings?.menusTitle || 'Menus'}
                </h5>
                <p className="text-sm text-base-content/60 italic">{languageStrings?.noMenuRequired || 'No menu selection is required for this time.'}</p>
            </div>
        );

      case 1: // Radio buttons for Menus
        menuContent = (
          <div className="addon-radio-group space-y-2">
            {finalMenuAddons.map(addon => {
              const isChecked = selectedAddons.menus.length > 0 && selectedAddons.menus[0].uid === addon.uid;
              return (
                <div key={addon.uid} className="addon-item usage1-radio p-2 border rounded-md hover:bg-base-300 transition-colors">
                  <label htmlFor={`menu-${addon.uid}`} className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="radio"
                      id={`menu-${addon.uid}`}
                      name="menu_addons_usage1"
                      value={addon.uid}
                      checked={isChecked}
                      onChange={(e) => commonMenuChangeHandler(addon, e.target.checked, 'radio')}
                      className="form-radio h-5 w-5 text-primary border-base-300 focus:ring-primary"
                    />
                    <div className="flex-grow">
                      <span className="addon-name font-medium text-base-content">{addon.name}</span>
                      {(() => { const ps = getAddonPriceString(addon); return ps ? (<span className="addon-price text-sm text-base-content/70 ml-2">({ps})</span>) : null; })()}
                      {addon.desc && <p className="text-xs text-base-content/60 mt-1">{addon.desc}</p>}
                    </div>
                  </label>
                </div>
              );
            })}
          </div>
        );
        break;

      case 2: // Quantity selectors for Menus (Each Guest any Menu)
        const currentTotalMenuUsage2Quantity = selectedAddons.menus.reduce((sum, menu) => sum + (menu.quantity || 0), 0);
        const canIncrementAnyMenuUsage2 = numericGuestCount === 0 || currentTotalMenuUsage2Quantity < numericGuestCount;

        menuContent = (
          <div className="space-y-3">
            {finalMenuAddons.map(addon => {
              const selectedMenu = selectedAddons.menus.find(m => m.uid === addon.uid);
              const currentQuantity = selectedMenu ? selectedMenu.quantity : 0;
              // Note: Min/max for menu quantity not defined in new spec, assuming no hard limit other than reasonable UI.
              // The addon's own min/max are for guest count visibility.

              let effectivePlusDisabled = false;
              // Rule 1: Sum of quantities <= guestCount
              if (numericGuestCount > 0 && currentTotalMenuUsage2Quantity >= numericGuestCount) {
                effectivePlusDisabled = true;
              }

              // Rule 2: Number of distinct menu types <= maxMenuTypesAllowed
              const maxMenuTypesAllowed = selectedShiftTime?.maxMenuTypes;
              if (!effectivePlusDisabled && maxMenuTypesAllowed > 0 && currentQuantity === 0) { // Only apply if trying to select a NEW distinct menu
                const distinctSelectedMenuTypesCount = new Set(selectedAddons.menus.filter(m => m.quantity > 0).map(m => m.uid)).size;
                if (distinctSelectedMenuTypesCount >= maxMenuTypesAllowed) {
                  effectivePlusDisabled = true;
                }
              }

              return (
                <div key={addon.uid} className={`addon-item usage2-item p-3 border rounded-md flex flex-col sm:flex-row justify-between items-start sm:items-center hover:bg-base-300 transition-colors ${effectivePlusDisabled && currentQuantity === 0 ? 'opacity-60 cursor-not-allowed' : ''}`}>
                  <div className="addon-info mb-2 sm:mb-0 sm:mr-4 flex-grow">
                    <span className="addon-name font-medium text-base-content">{addon.name}</span>
                    {(() => { const ps = getAddonPriceString(addon); return ps ? (<span className="addon-price text-sm text-base-content/70 ml-2">({ps})</span>) : null; })()}
                    {addon.desc && <p className="text-xs text-base-content/60 mt-1">{addon.desc}</p>}
                  </div>
                  <div className="addon-quantity-selector flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => commonMenuChangeHandler(addon, currentQuantity - 1, 'quantity')}
                      disabled={currentQuantity === 0}
                      className="qty-btn minus-btn px-3 py-1 bg-base-200 text-base-content rounded-md hover:bg-base-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      -
                    </button>
                    <input
                      type="text"
                      className="qty-input w-12 text-center border-base-300 rounded-md shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
                      value={currentQuantity}
                      readOnly
                    />
                    <button
                      type="button"
                      onClick={() => commonMenuChangeHandler(addon, currentQuantity + 1, 'quantity')}
                      disabled={effectivePlusDisabled}
                      className="qty-btn plus-btn px-3 py-1 bg-base-200 text-base-content rounded-md hover:bg-base-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      +
                    </button>
                  </div>
                </div>
              );
            })}
            {numericGuestCount > 0 && finalMenuAddons.length > 0 && (
              <p className="text-xs text-base-content/60 mt-1">
                {languageStrings?.menuUsage2TotalQuantityNote || `Total quantity of all selected menus cannot exceed guest count (${numericGuestCount}).`} ({currentTotalMenuUsage2Quantity}/{numericGuestCount} total quantity selected)
              </p>
            )}
          </div>
        );
        break;
      case 4: // Quantity selectors for Menus (Some guests same menu)
        const currentTotalMenuUsage4Quantity = selectedAddons.menus.reduce((sum, menu) => sum + (menu.quantity || 0), 0);
        const canIncrementAnyMenuUsage4 = numericGuestCount === 0 || currentTotalMenuUsage4Quantity < numericGuestCount;

        menuContent = (
          <div className="space-y-3">
            {finalMenuAddons.map(addon => {
              const selectedMenu = selectedAddons.menus.find(m => m.uid === addon.uid);
              const currentQuantity = selectedMenu ? selectedMenu.quantity : 0;

              let effectivePlusDisabled = false;
              // Rule 1: Sum of quantities <= guestCount (no equality requirement)
              if (numericGuestCount > 0 && currentTotalMenuUsage4Quantity >= numericGuestCount) {
                effectivePlusDisabled = true;
              }

              // Rule 2: Number of distinct menu types <= maxMenuTypesAllowed
              const maxMenuTypesAllowed = selectedShiftTime?.maxMenuTypes;
              if (!effectivePlusDisabled && maxMenuTypesAllowed > 0 && currentQuantity === 0) { // Only when selecting a NEW distinct menu
                const distinctSelectedMenuTypesCount = new Set(selectedAddons.menus.filter(m => m.quantity > 0).map(m => m.uid)).size;
                if (distinctSelectedMenuTypesCount >= maxMenuTypesAllowed) {
                  effectivePlusDisabled = true;
                }
              }

              return (
                <div key={addon.uid} className={`addon-item usage4-item p-3 border rounded-md flex flex-col sm:flex-row justify-between items-start sm:items-center hover:bg-base-300 transition-colors ${effectivePlusDisabled && currentQuantity === 0 ? 'opacity-60 cursor-not-allowed' : ''}`}>
                  <div className="addon-info mb-2 sm:mb-0 sm:mr-4 flex-grow">
                    <span className="addon-name font-medium text-base-content">{addon.name}</span>
                    {(() => { const ps = getAddonPriceString(addon); return ps ? (<span className="addon-price text-sm text-base-content/70 ml-2">({ps})</span>) : null; })()}
                    {addon.desc && <p className="text-xs text-base-content/60 mt-1">{addon.desc}</p>}
                  </div>
                  <div className="addon-quantity-selector flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => commonMenuChangeHandler(addon, currentQuantity - 1, 'quantity')}
                      disabled={currentQuantity === 0}
                      className="qty-btn minus-btn px-3 py-1 bg-base-200 text-base-content rounded-md hover:bg-base-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      -
                    </button>
                    <input
                      type="text"
                      className="qty-input w-12 text-center border-base-300 rounded-md shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
                      value={currentQuantity}
                      readOnly
                    />
                    <button
                      type="button"
                      onClick={() => commonMenuChangeHandler(addon, currentQuantity + 1, 'quantity')}
                      disabled={effectivePlusDisabled}
                      className="qty-btn plus-btn px-3 py-1 bg-base-200 text-base-content rounded-md hover:bg-base-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      +
                    </button>
                  </div>
                </div>
              );
            })}
            {finalMenuAddons.length > 0 && (
              <p className="text-xs text-base-content/60 mt-1">
                {(() => {
                  if (languageStrings?.menuUsage4TotalQuantityNote && numericGuestCount > 0) {
                    return String(languageStrings.menuUsage4TotalQuantityNote).replace('{guestCount}', numericGuestCount);
                  }
                  return numericGuestCount > 0
                    ? `Optional menus: you may select up to ${numericGuestCount} total menu(s).`
                    : `Optional menus: select any quantity.`;
                })()} ({currentTotalMenuUsage4Quantity}{numericGuestCount > 0 ? `/${numericGuestCount}` : ''} total selected)
              </p>
            )}
          </div>
        );
        break;

      case 3: // Checkboxes for Menus (Optional; cap = min(maxMenuTypes>0 ? maxMenuTypes : ∞, guests>0 ? guests : ∞))
        const baseMaxTypes = selectedShiftTime?.maxMenuTypes || 0; // 0 means unlimited
        const hasMaxTypesCap = baseMaxTypes > 0;
        const guestCap = numericGuestCount > 0 ? numericGuestCount : Infinity;
        const effectiveMaxSelections = hasMaxTypesCap ? Math.min(baseMaxTypes, guestCap) : guestCap;
        const currentSelectionsCount = selectedAddons.menus.length;
        const canSelectMoreMenus = currentSelectionsCount < effectiveMaxSelections;

        menuContent = (
          <div className="space-y-2">
            {finalMenuAddons.map(addon => {
              const isChecked = selectedAddons.menus.some(m => m.uid === addon.uid);
              const isDisabled = !isChecked && !canSelectMoreMenus;
              return (
                <div key={addon.uid} className={`addon-item usage3-item p-2 border rounded-md hover:bg-base-300 transition-colors ${isDisabled ? 'opacity-60 cursor-not-allowed' : ''}`}>
                  <label htmlFor={`menu-${addon.uid}`} className={`flex items-center space-x-3 ${isDisabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                    <input
                      type="checkbox"
                      id={`menu-${addon.uid}`}
                      value={addon.uid}
                      checked={isChecked}
                      disabled={isDisabled}
                      onChange={(e) => commonMenuChangeHandler(addon, e.target.checked, 'checkbox')}
                      className="form-checkbox h-5 w-5 text-primary rounded border-base-300 focus:ring-primary"
                    />
                     <div className="flex-grow">
                      <span className="addon-name font-medium text-base-content">{addon.name}</span>
                    {(() => { const ps = getAddonPriceString(addon); return ps ? (<span className="addon-price text-sm text-base-content/70 ml-2">({ps})</span>) : null; })()}
                      {addon.desc && <p className="text-xs text-base-content/60 mt-1">{addon.desc}</p>}
                    </div>
                  </label>
                </div>
              );
            })}
            <p className="text-xs text-base-content/60 mt-1">
              {hasMaxTypesCap
                ? (languageStrings?.menuUsage3NoteWithCap
                    ? String(languageStrings.menuUsage3NoteWithCap).replace('{maxMenuTypes}', baseMaxTypes)
                    : `Optional menus: you can select up to ${baseMaxTypes} menu type(s) or your guest count, whichever is smaller.`)
                : (languageStrings?.menuUsage3NoteGuestsOnly || `Optional menus: no menu-type limit; selections are restricted by your guest count.`)
              } ({currentSelectionsCount}/{Number.isFinite(effectiveMaxSelections) ? effectiveMaxSelections : '∞'} selected)
            </p>
          </div>
        );
        break;
      default: // Should ideally not happen if currentShiftUsagePolicy is validated upstream
        menuContent = <p className="text-sm text-error">{languageStrings?.invalidMenuUsage || 'Invalid menu configuration.'}</p>;
    }

    return (
      <div className="mb-6">
        <h4 className="text-lg font-semibold text-base-content mb-3">
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
      // Check if the parent menu (by originalIndexInShift) is selected
      return selectedAddons.menus.some(selectedMenu => selectedMenu.originalIndexInShift === option.parent);
    });

    if (visibleOptions.length === 0) {
      // Show message if options exist but none are visible due to parent linking or if all options were filtered by guest count initially
      if (finalOptionAddons.length > 0 || (optionAddonsFromShift.length > 0 && numericGuestCount > 0)) {
         return (
            <div className="mt-4">
                <h4 className="text-lg font-semibold text-base-content mb-3 border-t pt-4 mt-4">
                    {languageStrings?.optionsTitle || 'Optional Add-ons'}
                </h4>
                <p className="text-sm text-base-content/60 italic">
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
        <h4 className="text-lg font-semibold text-base-content mb-3 border-t pt-4 mt-4">
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

            let maxByParentQty = Infinity;
            if (addon.parent !== -1) {
                const parentMenu = selectedAddons.menus.find(m => m.originalIndexInShift === addon.parent);
                if (parentMenu) {
                    // If parent menu is usage 1 or 3 (selected, not quantity based for itself), option cap is 1
                    // If parent menu is usage 2, option cap is parent's quantity
                    maxByParentQty = (parentMenu.quantity !== undefined) ? parentMenu.quantity : 1;
                } else {
                    maxByParentQty = 0; // Parent not selected, so option quantity derived from it must be 0
                }
            }

            const effectiveMaxQty = Math.min(optionMaxQty, maxAllowedByGuestCount, maxByParentQty);

            const canIncrement = currentQuantity < effectiveMaxQty;
            // Decrement is possible if currentQuantity > 0. Min check is for setting, not for button enabling if already > 0.
            // However, if currentQuantity is already below optionMinQty (e.g. parent qty reduced), then can't decrement further.
            const canDecrement = currentQuantity > 0 && currentQuantity >= optionMinQty ;
            // More precise: can decrement if currentQuantity > optionMinQty. If currentQuantity === optionMinQty, cannot decrement.
            // But if optionMinQty is 0, then can decrement as long as currentQuantity > 0.
            // So, if optionMinQty > 0, then currentQuantity > optionMinQty. If optionMinQty = 0, then currentQuantity > 0.
            // This simplifies to: currentQuantity > optionMinQty (if optionMinQty = 0, this means currentQuantity > 0)
            // Let's stick to: currentQuantity > 0, and the handler will ensure it doesn't go below optionMinQty.
            // The button should disable if currentQuantity IS optionMinQty (and optionMinQty > 0)
            // Or if currentQuantity is 0.
            // const minusButtonDisabled = currentQuantity === 0 || (optionMinQty > 0 && currentQuantity <= optionMinQty);
            // CORRECTED LOGIC: Minus button only disabled if quantity is already 0.
            const minusButtonDisabled = currentQuantity === 0;


            return (
              <div key={addon.uid} className="addon-item option-item p-3 border rounded-md flex flex-col sm:flex-row justify-between items-start sm:items-center hover:bg-base-300 transition-colors">
                <div className="addon-info mb-2 sm:mb-0 sm:mr-4 flex-grow">
                  <span className="addon-name font-medium text-base-content">{addon.name}</span>
                      {(() => { const ps = getAddonPriceString(addon); return ps ? (<span className="addon-price text-sm text-base-content/70 ml-2">({ps})</span>) : null; })()}
                  {addon.desc && <p className="text-xs text-base-content/60 mt-1">{addon.desc}</p>}
                </div>
                <div className="addon-quantity-selector flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => commonOptionChangeHandler(addon, currentQuantity - 1)}
                    disabled={minusButtonDisabled}
                    className="qty-btn minus-btn px-3 py-1 bg-base-200 text-base-content rounded-md hover:bg-base-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    -
                  </button>
                  <input
                    type="text"
                    className="qty-input w-12 text-center border-base-300 rounded-md shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
                    value={currentQuantity}
                    readOnly
                  />
                  <button
                    type="button"
                    onClick={() => commonOptionChangeHandler(addon, currentQuantity + 1)}
                    disabled={!canIncrement}
                    className="qty-btn plus-btn px-3 py-1 bg-base-200 text-base-content rounded-md hover:bg-base-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>
            );
          })}
           {/* Helper text for option quantity rules if needed */}
           {visibleOptions.length > 0 && (
            <p className="text-xs text-base-content/60 mt-1">
              {languageStrings?.optionQuantityNote || `Quantities for options are per item and cannot exceed guest count. Each option may also have its own min/max quantity limits.`}
            </p>
           )}
        </div>
      </div>
    );
  };


  return (
    <div className="mt-6 p-4 border border-base-300 rounded-lg shadow bg-base-100">
      {renderMenuAddons()}
      {renderOptionAddons()}
    </div>
  );
};

export default AddonSelection;
