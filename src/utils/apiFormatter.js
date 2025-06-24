/**
 * Formats the selected addons object into a comma-separated string for API submission.
 * Each addon is represented as `uid` or `uid:quantity`.
 *
 * @param {object} addonsObject - The selected addons state (e.g., state.currentSelectedAddons).
 *   Expected structure: { usage1: object|null, usage2: array, usage3: array }
 * @returns {string} A comma-separated string of selected addon UIDs and quantities.
 */
export function formatSelectedAddonsForApi(addonsObject) {
  if (!addonsObject) {
    return "";
  }

  const apiParams = [];

  // Usage Policy 1 (single selection: checkbox or radio)
  if (addonsObject.usage1 && addonsObject.usage1.uid) {
    apiParams.push(addonsObject.usage1.uid);
  }

  // Usage Policy 2 (incremental quantity)
  if (addonsObject.usage2 && addonsObject.usage2.length > 0) {
    addonsObject.usage2.forEach(addon => {
      if (addon.uid && addon.quantity > 0) {
        apiParams.push(`${addon.uid}:${addon.quantity}`);
      }
    });
  }

  // Usage Policy 3 & Default/Generic (multiple checkboxes)
  if (addonsObject.usage3 && addonsObject.usage3.length > 0) {
    addonsObject.usage3.forEach(addon => {
      if (addon.uid) {
        apiParams.push(addon.uid);
      }
    });
  }

  return apiParams.join(',');
}
