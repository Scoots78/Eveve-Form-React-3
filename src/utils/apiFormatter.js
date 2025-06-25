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
