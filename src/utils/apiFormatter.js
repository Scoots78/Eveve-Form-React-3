/**
 * Formats the selected addons object into a comma-separated string for API submission.
 * Each addon is represented as `uid` or `uid:quantity`.
 *
 * @param {object} addonsObject - The selected addons state (e.g., state.currentSelectedAddons).
 *   Expected structure: { usage1: object|null, usage2: array, usage3: array }
 * @returns {string} A comma-separated string of selected addon UIDs and quantities.
 */
export function formatSelectedAddonsForApi(selectedAddons) {
  if (!selectedAddons || (!selectedAddons.menus?.length && !Object.keys(selectedAddons.options || {}).length)) {
    return "";
  }

  const apiParams = [];

  // Process selected menus
  if (selectedAddons.menus && selectedAddons.menus.length > 0) {
    selectedAddons.menus.forEach(menu => {
      if (menu.uid) {
        if (typeof menu.quantity === 'number' && menu.quantity > 0) {
          // This case is for menus selected under usage:2 (quantity selectors)
          apiParams.push(`${menu.uid}:${menu.quantity}`);
        } else {
          // This case is for menus selected under usage:1 (radio) or usage:3 (checkbox)
          // or usage:2 menus with quantity 0 that somehow didn't get removed (shouldn't happen with current logic)
          // For simplicity, if quantity is not present or not > 0, just send UID.
          apiParams.push(menu.uid);
        }
      }
    });
  }

  // Process selected options
  if (selectedAddons.options && Object.keys(selectedAddons.options).length > 0) {
    for (const optionUid in selectedAddons.options) {
      const quantity = selectedAddons.options[optionUid];
      if (quantity > 0) { // Ensure only options with quantity > 0 are included
        apiParams.push(`${optionUid}:${quantity}`);
      }
    }
  }

  return apiParams.join(',');
}

/**
 * Formats the seating area for API usage.
 * Eveve generally accepts the literal string “any” to indicate no preference,
 * but some integrations omit the parameter entirely in that case.
 * This helper returns:
 *   • ''           – when no area was chosen (caller should omit param)
 *   • 'any'        – when user explicitly picked the “Any Area” option
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

  // Normalise to case-insensitive match for “any”
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
