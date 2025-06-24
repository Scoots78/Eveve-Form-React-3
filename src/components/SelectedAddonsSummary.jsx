import React from 'react';

const SelectedAddonsSummary = ({ selectedAddons, currencySymbol, languageStrings, guestCount }) => {
  const numericGuestCount = parseInt(guestCount, 10) || 1; // Default to 1 if guestCount is not valid, for per-guest calculation
  const displaySymbol = currencySymbol || '$';

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

  // Usage 1
  if (selectedAddons.usage1) {
    const addon = selectedAddons.usage1;
    const detail = getIndividualAddonPriceString(addon);
    itemsDetails.push(detail.text);
    totalAddonCost += detail.cost;
  }

  // Usage 2
  selectedAddons.usage2.forEach(addon => {
    // For usage 2, the price is per item, and quantity is specified.
    const itemUnitCost = addon.price;
    const itemTotalCost = itemUnitCost * addon.quantity;
    const displayItemUnitCost = `${displaySymbol}${(itemUnitCost / 100).toFixed(2)}`;
    let perWhat = languageStrings?.perItem || 'per Item';
      if (addon.per && addon.per !== 'Guest') {
        perWhat = `${languageStrings?.per || 'per'} ${addon.per}`;
      } else if (addon.per === 'Guest') {
        // This is tricky for usage 2. If price is per item, but also per guest for that item.
        // The current model in ADDONS_README implies usage 2 quantity is the primary driver.
        // If a usage 2 item's base price itself is "per Guest", then itemUnitCost * guestCount * quantity.
        // For now, assume usage 2 addon.price is fixed per unit of the addon.
        perWhat = languageStrings?.perPerson || 'per Person'; // This would make it itemUnitCost * guestCount * quantity
        // To avoid double counting or confusion, let's stick to the simpler model for Usage 2:
        // price is per unit of the addon, quantity is selected.
        // If a Usage 2 item IS per guest, it should be handled by its base price reflecting that, or be a Usage 1/3 type.
        // Reverting to simpler perItem for usage 2 as 'per Guest' is complex here.
         perWhat = languageStrings?.perItem || 'per Item';
         if (addon.per && addon.per !== 'Guest') {
            perWhat = `${languageStrings?.per || 'per'} ${addon.per}`;
         }

    }


    itemsDetails.push(`${addon.name} x${addon.quantity} (${displayItemUnitCost} ${perWhat}) - Total: ${displaySymbol}${(itemTotalCost / 100).toFixed(2)}`);
    totalAddonCost += itemTotalCost;
  });

  // Usage 3 (and 0)
  selectedAddons.usage3.forEach(addon => {
    const detail = getIndividualAddonPriceString(addon);
    itemsDetails.push(detail.text);
    totalAddonCost += detail.cost;
  });

  if (itemsDetails.length === 0) {
    return null; // Don't render if no addons are selected
  }

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
