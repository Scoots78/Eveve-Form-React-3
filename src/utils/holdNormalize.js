/**
 * Normalizes hold response data to handle both legacy and new card object formats.
 * 
 * The Eveve API has two formats for the hold response:
 * 1. Legacy format: `card` is a number (e.g., `card: 1`)
 * 2. New format: `card` is an object (e.g., `card: {code: 1, perHead: 3000, total: 6000, msg: "..."}`)
 * 
 * This function normalizes both formats to ensure consistent property access throughout the application.
 * 
 * @param {Object} hold - Raw hold response from Eveve API
 * @returns {Object} Normalized hold data with consistent structure
 * 
 * @example
 * // Legacy format input
 * const legacyHold = {
 *   uid: 42099,
 *   created: 1752799999,
 *   card: 1,
 *   perHead: 3000,
 *   total: 6000,
 *   covers: 2
 * };
 * const normalized1 = normalizeHold(legacyHold);
 * // Result: {uid: 42099, created: 1752799999, card: 1, perHead: 3000, total: 6000, covers: 2, cardMessage: ''}
 * 
 * @example
 * // New format input
 * const newHold = {
 *   uid: 42099,
 *   created: 1752799999,
 *   card: {
 *     code: 1,
 *     perHead: 3000,
 *     total: 6000,
 *     msg: "A charge of 30.00 per person will be applied in the event of a no-show<br/>"
 *   },
 *   covers: 2,
 *   event: 1005
 * };
 * const normalized2 = normalizeHold(newHold);
 * // Result: {uid: 42099, created: 1752799999, card: 1, perHead: 3000, total: 6000, covers: 2, event: 1005, 
 * //          cardMessage: "A charge of 30.00 per person will be applied in the event of a no-show<br/>"}
 */
export function normalizeHold(hold) {
  if (!hold) return null;
  
  // Extract card properties based on whether card is an object or primitive
  const obj = typeof hold.card === 'object' ? hold.card : {
    code: hold.card ?? 0,
    perHead: hold.perHead ?? 0,
    total: hold.total ?? 0,
    msg: hold.msg || ''
  };
  
  // Return a new object with normalized properties
  return {
    ...hold,                // Keep all original properties
    card: obj.code,         // Replace card with code value
    perHead: obj.perHead,   // Ensure perHead is available
    total: obj.total,       // Ensure total is available
    cardMessage: obj.msg    // Add cardMessage property for display
  };
}
