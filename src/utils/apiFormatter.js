/**
 * Formats the selected addons object into a comma-separated string for API submission.
 * Each addon is represented as `uid` or `uid:quantity`.
 *
 * @param {object} addonsObject - The selected addons state (e.g., state.currentSelectedAddons).
 *   Expected structure: { menus: array, options: object }
 * @param {number} [guestCount=null] - The number of guests for the booking, used for usage=1 addons
 * @param {boolean} [useFriendlyNames=false] - When true, use addon.name instead of addon.uid
 * @returns {string} A comma-separated string of selected addon UIDs and quantities.
 */
export function formatSelectedAddonsForApi(
  selectedAddons,
  guestCount = null,
  useFriendlyNames = false
) {
  if (!selectedAddons || (!selectedAddons.menus?.length && !Object.keys(selectedAddons.options || {}).length)) {
    return "";
  }

  const apiParams = [];
  const numericGuestCount = guestCount !== null ? parseInt(guestCount, 10) : null;

  // Process selected menus
  if (selectedAddons.menus && selectedAddons.menus.length > 0) {
    selectedAddons.menus.forEach(menu => {
      // Decide which identifier to use – UID for API, name for UI
      const idOrName = useFriendlyNames ? menu.name ?? menu.uid : menu.uid;

      if (idOrName) {
        if (typeof menu.quantity === 'number' && menu.quantity > 0) {
          // usage:2 (quantity selectors)
          apiParams.push(`${idOrName}:${menu.quantity}`);
        } else if (menu.usagePolicy === 1 && numericGuestCount && numericGuestCount > 0) {
          // usage:1 (all guests same menu) – qty = guest count
          apiParams.push(`${idOrName}:${numericGuestCount}`);
        } else if (menu.usagePolicy === 3) {
          // usage:3 (optional checkbox) – API requires an explicit quantity of 1
          apiParams.push(`${idOrName}:1`);
        } else {
          // Fallback: send UID as-is (should be rare)
          apiParams.push(idOrName);
        }
      }
    });
  }

  // Process selected options
  if (selectedAddons.options && Object.keys(selectedAddons.options).length > 0) {
    for (const optionUid in selectedAddons.options) {
      const quantity = selectedAddons.options[optionUid];
      if (quantity > 0) { // Ensure only options with quantity > 0 are included
        const idOrName = useFriendlyNames
          ? selectedAddons.optionsMeta?.[optionUid]?.name || optionUid
          : optionUid;
        apiParams.push(`${idOrName}:${quantity}`);
      }
    }
  }

  return apiParams.join(',');
}

/**
 * Returns a user-friendly, comma-separated string of selected addon names for UI
 * display. Quantities are appended “×N” when the quantity is greater than 1.
 *
 * NOTE: This helper never exposes UIDs – it is purely for presentation.
 *
 * @param {object} selectedAddons – Same structure as in formatSelectedAddonsForApi
 * @param {number|null} [guestCount=null] – Needed for usage=1 menus to infer qty
 * @returns {string} Friendly string such as “Set Menu ×2, Children’s Menu ×1”
 */
export function formatAddonsForDisplay(selectedAddons, guestCount = null) {
  const parts = [];
  const numericGuestCount = guestCount !== null ? parseInt(guestCount, 10) : null;

  if (!selectedAddons) return '';

  // Menus
  selectedAddons.menus?.forEach((menu) => {
    if (!menu.name) return; // skip if no friendly name
    let qty = 1;
    if (typeof menu.quantity === 'number' && menu.quantity > 0) {
      qty = menu.quantity;
    } else if (menu.usagePolicy === 1 && numericGuestCount) {
      qty = numericGuestCount;
    }
    parts.push(qty > 1 ? `${menu.name} ×${qty}` : menu.name);
  });

  // Options
  if (selectedAddons.options) {
    for (const optionUid in selectedAddons.options) {
      const quantity = selectedAddons.options[optionUid];
      if (quantity > 0) {
        const friendly = selectedAddons.optionsMeta?.[optionUid]?.name || optionUid;
        parts.push(quantity > 1 ? `${friendly} ×${quantity}` : friendly);
      }
    }
  }

  return parts.join(', ');
}

/**
 * Formats the seating area for API usage.
 * Eveve generally accepts the literal string "any" to indicate no preference,
 * but some integrations omit the parameter entirely in that case.
 * This helper returns:
 *   • ''           – when no area was chosen (caller should omit param)
 *   • 'any'        – when user explicitly picked the "Any Area" option
 *   • '<area-uid>' – for a specific area selection
 *
 * NOTE: It does **not** prepend the `area=` key or URL-encode the value.
 * That responsibility is left to the code constructing the final query/string,
 * allowing flexibility for GET vs POST payloads.
 *
 * @param {string|null|undefined} selectedArea  The currently chosen area UID
 *                                              or the literal string 'any'.
 * @returns {string} A formatted area value ready for inclusion in API data
 */
export function formatAreaForApi(selectedArea) {
  if (!selectedArea) return '';          // nothing selected → omit

  // Normalise to case-insensitive match for "any"
  if (typeof selectedArea === 'string' && selectedArea.trim().toLowerCase() === 'any') {
    return 'any';
  }

  // For concrete areas just return the raw/trimmed value.
  return String(selectedArea).trim();
}

/**
 * Formats customer details for API submission.
 * This is a helper to ensure consistency when sending customer data to the Eveve API.
 *
 * @param {Object} customerData - The customer details object
 * @param {string} customerData.firstName - Customer first name
 * @param {string} customerData.lastName - Customer last name
 * @param {string} customerData.email - Customer email address
 * @param {string} customerData.phone - Customer phone number
 * @param {string} [customerData.notes] - Optional booking notes
 * @param {boolean} [customerData.optin] - Mailing list opt-in (default true)
 * @param {Object} [customerData.allergy] - Allergy information
 * @param {boolean} customerData.allergy.has - Whether the customer has allergies
 * @param {string} customerData.allergy.details - Allergy details if has=true
 * @returns {Object} Formatted data ready for URL parameters or request body
 */
export function formatCustomerDetails(customerData) {
  // Validate required fields
  if (!customerData.firstName || !customerData.lastName || !customerData.email || !customerData.phone) {
    throw new Error('Missing required customer details');
  }

  // Basic formatted object
  const formatted = {
    fname: customerData.firstName.trim(),
    lname: customerData.lastName.trim(),
    email: customerData.email.trim(),
    phone: customerData.phone.trim(),
    optin: customerData.optin !== false ? 1 : 0 // Default to opt-in unless explicitly false
  };

  // Add optional fields if present
  if (customerData.notes) {
    formatted.notes = customerData.notes.trim();
  }

  // Handle allergy information
  if (customerData.allergy) {
    formatted.allergy = customerData.allergy.has ? 1 : 0;
    if (customerData.allergy.has && customerData.allergy.details) {
      formatted.allergytext = customerData.allergy.details.trim();
    }
  }

  return formatted;
}
