import React from 'react';

const SelectedAddonsSummary = ({ selectedAddons, currencySymbol, languageStrings, guestCount, currentShiftAddons }) => {
  const numericGuestCount = parseInt(guestCount, 10) || 1; // Default to 1 if guestCount is not valid, for per-guest calculation
  const displaySymbol = currencySymbol || '$';

  const findAddonByUid = (uid) => {
    if (!currentShiftAddons) return null;
    return currentShiftAddons.find(a => a.uid === uid);
  };

  const getIndividualAddonPriceString = (addon, quantity = 1) => {
    if (typeof addon.price !== 'number') return { text: addon.name, cost: 0 };

    let itemBasePrice = addon.price;
    let itemTotalCost = 0;
    let priceDescription = "";

    const formattedBasePrice = `${displaySymbol}${(itemBasePrice / 100).toFixed(2)}`;

    if (addon.per === 'Guest') {
      itemTotalCost = itemBasePrice * numericGuestCount * quantity; // quantity is usually 1 unless it's a usage2 item being summarized this way
      priceDescription = `${formattedBasePrice} ${languageStrings?.perPerson || 'per Person'}`;
      if (quantity > 1) { // For summarizing a usage2 item if needed, though typically usage2 is itemized differently
        priceDescription = `${addon.name} x${quantity} (${formattedBasePrice} ${languageStrings?.perPerson || 'per Person'}) - Total: ${displaySymbol}${(itemTotalCost / 100).toFixed(2)}`;
         return { text: priceDescription, cost: itemTotalCost};
      }
    } else { // Item, Party, or undefined
      itemTotalCost = itemBasePrice * quantity;
      let perWhat = languageStrings?.perItem || 'per Item';
      if (addon.per && addon.per !== 'Guest') {
        perWhat = `${languageStrings?.per || 'per'} ${addon.per}`;
      }
      priceDescription = `${formattedBasePrice} ${perWhat}`;
      if (quantity > 1) {
         priceDescription = `${addon.name} x${quantity} (${formattedBasePrice} ${perWhat}) - Total: ${displaySymbol}${(itemTotalCost / 100).toFixed(2)}`;
         return { text: priceDescription, cost: itemTotalCost};
      }
    }

    if (addon.price === 0) {
        priceDescription = languageStrings?.free || "Free";
    }

    return { text: `${addon.name} (${priceDescription})`, cost: itemTotalCost };
  };


  const itemsDetails = [];
  let totalAddonCost = 0;

  // Process Menus
  selectedAddons.menus.forEach(menu => {
    const quantity = menu.quantity || 1; // Default to 1 if no quantity (e.g., usage 1 or 3)
    const detail = getIndividualAddonPriceString(menu, quantity); // Pass quantity for correct cost calculation if per Guest

    let displayText = menu.name;
    if (menu.quantity) { // Typically for usage:2 menus
      displayText = `${menu.name} x${menu.quantity}`;
    }

    let pricePortion = "";
    if (menu.price === 0) {
        pricePortion = `(${languageStrings?.free || "Free"})`
    } else if (menu.price > 0) {
        const unitPriceString = `${displaySymbol}${(menu.price / 100).toFixed(2)}`;
        let perWhat = "";
        if (menu.per === 'Guest') {
            perWhat = ` ${languageStrings?.perPerson || 'per Person'}`;
        } else if (menu.per) {
            perWhat = ` ${languageStrings?.per || 'per'} ${menu.per}`;
        } else {
            perWhat = ` ${languageStrings?.perItem || 'per Item'}`;
        }
        pricePortion = `(${unitPriceString}${perWhat})`;
    }

    itemsDetails.push(`${displayText} ${pricePortion}`);
    totalAddonCost += detail.cost; // detail.cost already considers quantity for "per Guest" items
  });

  // Process Options
  for (const optionUid in selectedAddons.options) {
    const quantity = selectedAddons.options[optionUid];
    if (quantity > 0) {
      // Find the full option addon object from currentShiftAddons (passed as prop, or need to get it)
      // This part is tricky: SelectedAddonsSummary might not have access to the full addon objects easily.
      // For now, let's assume we can retrieve it or that critical info (name, price, per) is stored with selection.
      // The current `selectedAddons.options` only stores UID and quantity.
      // This implies `getIndividualAddonPriceString` needs the full addon object.
      // This will require a change in how options are stored or passed to summary.

      // --- TEMPORARY: Assuming option details are somehow available ---
      // This will need to be addressed by passing currentShiftAddons to SelectedAddonsSummary
      // or by storing more option data in selectedAddons.options.
      // For now, this part of the summary will be incomplete for options.
      // Let's assume we have the option object:
      // const optionAddon = findOptionByUid(optionUid); // Placeholder function
      // if (optionAddon) {
      //   const detail = getIndividualAddonPriceString(optionAddon, quantity);
      //   itemsDetails.push(`${optionAddon.name} x${quantity} (${(detail.cost / quantity / 100).toFixed(2)} per...)`); // Simplified
      //   totalAddonCost += detail.cost;
      // } else {
      //    itemsDetails.push(`Option UID: ${optionUid} x${quantity} (Details unavailable)`);
      // }
      // --- END TEMPORARY ---

      // For now, to make it runnable, we'll just list UIDs and quantities for options
      const optionAddon = findAddonByUid(optionUid);
      if (optionAddon) {
        const detail = getIndividualAddonPriceString(optionAddon, quantity); // detail.cost is total for this option line

        let nameStr = optionAddon.name;
        if (quantity > 1) {
          nameStr = `${optionAddon.name} x${quantity}`;
        }

        let priceStr = "";
        if (optionAddon.price === 0 && !(optionAddon.per === "Guest")) { // Avoid "$0.00 per Person" for free non-guest items
            priceStr = `(${languageStrings?.free || "Free"})`;
        } else if (typeof optionAddon.price === 'number') {
            const unitPrice = `${displaySymbol}${(optionAddon.price / 100).toFixed(2)}`;
            let perText = "";
            if (optionAddon.per === 'Guest') {
                perText = ` ${languageStrings?.perPerson || 'per Person'}`;
            } else if (optionAddon.per) {
                perText = ` ${languageStrings?.per || 'per'} ${optionAddon.per}`;
            } else { // Default if addon.per is undefined or null
                perText = ` ${languageStrings?.perItem || 'per Item'}`;
            }
            priceStr = `(${unitPrice}${perText})`;
        }

        // Include description if available
        let descStr = "";
        if (optionAddon.desc && String(optionAddon.desc).trim() !== "") {
            // Using a simple text separator for description in summary.
            // For actual italics, would need to return JSX or handle HTML.
            // For now, keeping it as a plain string.
            descStr = ` - ${String(optionAddon.desc).trim()}`;
        }
        // console.log('Summarizing Option:', optionAddon.uid, 'Name:', optionAddon.name, 'Desc:', optionAddon.desc);
        // console.log('descStr for', optionAddon.uid, 'is:', descStr);

        itemsDetails.push(`${nameStr} ${priceStr}${descStr}`);
        totalAddonCost += detail.cost;
      } else {
        // Fallback if option details are somehow not found
        itemsDetails.push(`Option (UID: ${optionUid}) x${quantity} - Details Missing`);
      }
    }
  }


  if (itemsDetails.length === 0) {
    return null; // Don't render if no addons are selected
  }

  // Helper to find full addon object (needs currentShiftAddons to be passed to this component)
  // const findAddonByUid = (uid, allAddons) => allAddons.find(a => a.uid === uid); // Moved to top

  // Recalculate total cost more robustly if full addon objects are accessible
  // For now, the totalAddonCost is primarily from menus.
  // This section needs to be completed once option details are fully available in summary.

  return (
    <div className="mt-6 p-4 border border-blue-200 rounded-lg shadow bg-blue-50">
      <h5 className="text-md font-semibold text-blue-700 mb-2">
        {languageStrings?.selectedAddonsSummaryTitle || 'Selected Addons Summary'}
      </h5>
      {itemsDetails.length > 0 ? (
        <>
          <ul className="list-disc list-inside space-y-1 text-sm text-blue-600">
            {itemsDetails.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
          <p className="mt-3 text-sm font-semibold text-blue-700">
            {languageStrings?.totalAddonCostLabel || 'Total Addon Cost'}: {displaySymbol}{(totalAddonCost / 100).toFixed(2)}
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
