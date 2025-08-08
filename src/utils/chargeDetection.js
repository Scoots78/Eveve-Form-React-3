/**
 * Utility functions for determining if payment is required for a booking
 * based on hold API response, shift charge type, and selected addons.
 */

/**
 * Determines if payment is required based on multiple factors
 * 
 * @param {Object} holdData - Response from the hold API call
 * @param {Object} selectedShiftTime - The currently selected shift/time
 * @param {Object} selectedAddons - The addons selected by the user
 * @param {Array} currentShiftAddons - Available addons for the current shift
 * @param {number} guestCount - Number of guests (needed for per-guest addon cost)
 * @returns {boolean} - True if payment is required, false otherwise
 */
export function isPaymentRequired(
  holdData,
  selectedShiftTime,
  selectedAddons = {},
  currentShiftAddons = [],
  guestCount = 0
) {
  // Apply effective hold transformation first
  const effectiveHold = getEffectiveHoldData(
    holdData,
    selectedShiftTime,
    selectedAddons,
    currentShiftAddons,
    guestCount
  );

  // Get detailed charge reason for logging
  const chargeReason = getChargeReason(
    effectiveHold,
    selectedShiftTime,
    selectedAddons,
    currentShiftAddons
  );
  
  // Log the decision for debugging
  console.log('[chargeDetection] Payment required:', chargeReason.isRequired, 'Reason:', chargeReason.reason);
  
  return chargeReason.isRequired;
}

/**
 * Provides detailed information about why payment is or isn't required
 * 
 * @param {Object} holdData - Response from the hold API call
 * @param {Object} selectedShiftTime - The currently selected shift/time
 * @param {Object} selectedAddons - The addons selected by the user
 * @param {Array} currentShiftAddons - Available addons for the current shift
 * @returns {Object} - Object containing isRequired (boolean) and reason (string)
 */
export function getChargeReason(holdData, selectedShiftTime, selectedAddons = {}, currentShiftAddons = []) {
  // Default result object
  const result = {
    isRequired: false,
    reason: 'No payment required',
    details: {
      holdDataCard: holdData?.card || 0,
      holdDataPerHead: holdData?.perHead || 0,
      shiftCharge: selectedShiftTime?.charge || 0,
      hasChargeableAddons: false
    }
  };

  // Check if holdData is missing or invalid
  if (!holdData) {
    console.warn('[chargeDetection] Missing holdData, defaulting to no payment required');
    return result;
  }

  // CASE 1: Check if the hold API response indicates payment is required
  if (holdData.card > 0) {
    result.isRequired = true;
    result.reason = holdData.card === 1 
      ? 'No-show protection required (holdData.card = 1)' 
      : 'Deposit required (holdData.card = 2)';
    return result;
  }

  // CASE 2: Check if the selected shift requires a charge (charge = 2)
  if (selectedShiftTime && selectedShiftTime.charge === 2) {
    result.isRequired = true;
    result.reason = 'Shift requires deposit (shift.charge = 2)';
    return result;
  }

  // CASE 3: Check if any selected addons come from a shift with charge = 2
  // First check if we have addons and shift addons to examine
  if (selectedAddons && currentShiftAddons && currentShiftAddons.length > 0) {
    // Check menus
    if (selectedAddons.menus && selectedAddons.menus.length > 0) {
      for (const menu of selectedAddons.menus) {
        const menuAddon = currentShiftAddons.find(addon => addon.uid === menu.uid);
        if (menuAddon && menuAddon.charge === 2) {
          result.isRequired = true;
          result.reason = `Menu addon "${menuAddon.name}" requires deposit (addon.charge = 2)`;
          result.details.hasChargeableAddons = true;
          return result;
        }
      }
    }

    // Check options
    if (selectedAddons.options && Object.keys(selectedAddons.options).length > 0) {
      for (const optionUid in selectedAddons.options) {
        if (selectedAddons.options[optionUid] > 0) {
          const optionAddon = currentShiftAddons.find(addon => String(addon.uid) === optionUid);
          if (optionAddon && optionAddon.charge === 2) {
            result.isRequired = true;
            result.reason = `Option addon "${optionAddon.name}" requires deposit (addon.charge = 2)`;
            result.details.hasChargeableAddons = true;
            return result;
          }
        }
      }
    }
  }

  // If we get here, no payment is required
  return result;
}

/**
 * Calculate total addon cost (in cents)
 */
function calculateTotalAddonCost(
  selectedAddons = {},
  currentShiftAddons = [],
  guestCount = 0
) {
  let total = 0;

  // --- Menus ---
  (selectedAddons.menus || []).forEach((menu) => {
    const qty = menu.quantity || 1;
    if (typeof menu.price === "number") {
      if (menu.per === "Guest") {
        total += menu.price * guestCount * qty;
      } else {
        total += menu.price * qty;
      }
    }
  });

  // --- Options ---
  if (selectedAddons.options) {
    Object.entries(selectedAddons.options).forEach(([uid, qty]) => {
      if (qty > 0) {
        const addon = currentShiftAddons.find((a) => String(a.uid) === uid);
        if (addon && typeof addon.price === "number") {
          if (addon.per === "Guest") {
            total += addon.price * guestCount * qty;
          } else {
            total += addon.price * qty;
          }
        }
      }
    });
  }
  return total;
}

/**
 * Returns an overridden holdData object when shift.charge === 2
 * so that payment logic uses the correct deposit amount.
 * card is forced to 2 and perHead set to totalAddonCost.
 * 
 * @param {Object} holdData
 * @param {Object} selectedShiftTime
 * @param {Object} selectedAddons
 * @param {Array} currentShiftAddons
 * @param {number} guestCount
 * @returns {Object} effectiveHoldData
 */
export function getEffectiveHoldData(
  holdData = {},
  selectedShiftTime = {},
  selectedAddons = {},
  currentShiftAddons = [],
  guestCount = 0
) {
  if (selectedShiftTime?.charge === 2) {
    const totalAddonCost = calculateTotalAddonCost(
      selectedAddons,
      currentShiftAddons,
      guestCount
    );

    return {
      ...holdData,
      card: 2,
      perHead: totalAddonCost,
    };
  }
  return holdData;
}

/**
 * Debug function to log all factors affecting payment requirement
 * 
 * @param {Object} holdData - Response from the hold API call
 * @param {Object} selectedShiftTime - The currently selected shift/time
 * @param {Object} selectedAddons - The addons selected by the user
 * @param {Array} currentShiftAddons - Available addons for the current shift
 */
export function debugChargeFactors(holdData, selectedShiftTime, selectedAddons = {}, currentShiftAddons = []) {
  console.group('[chargeDetection] Debug Payment Factors');
  
  console.log('Hold Data:', {
    card: holdData?.card || 0,
    perHead: holdData?.perHead || 0
  });
  
  console.log('Selected Shift:', {
    name: selectedShiftTime?.name || 'None',
    charge: selectedShiftTime?.charge || 0
  });
  
  console.log('Selected Addons:', {
    menus: selectedAddons?.menus?.length || 0,
    options: Object.keys(selectedAddons?.options || {}).length || 0
  });
  
  // Check for addons with charge = 2
  const chargeableAddons = currentShiftAddons?.filter(addon => addon.charge === 2) || [];
  console.log('Addons requiring charge:', chargeableAddons.map(a => `${a.name} (${a.uid})`));
  
  // Get final decision
  const decision = getChargeReason(holdData, selectedShiftTime, selectedAddons, currentShiftAddons);
  console.log('Final Decision:', decision);
  
  console.groupEnd();
  
  return decision;
}
