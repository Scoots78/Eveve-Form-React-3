/**
 * Utility functions for handling Event availability times
 */

/**
 * Extracts available times for Event bookings from non-Event type shifts
 * 
 * Event bookings should only be available at times when regular service is available.
 * This function extracts all available times from non-Event shifts (like Lunch, Dinner, etc.)
 * and returns a deduplicated array of times that Event bookings should be restricted to.
 * 
 * @param {Array} shifts - The shifts array from the API response
 * @returns {Array} - Sorted array of available times for Event bookings
 */
export const getEventAvailableTimes = (shifts) => {
  // Handle edge cases
  if (!shifts || !Array.isArray(shifts) || shifts.length === 0) {
    return [];
  }

  // Filter to get all non-Event type shifts
  const nonEventShifts = shifts.filter(shift => 
    shift && shift.type && shift.type !== "Event"
  );

  // If no non-Event shifts found, return empty array
  if (nonEventShifts.length === 0) {
    return [];
  }

  // Extract available times from all non-Event shifts
  // Some shifts use 'times' array, others might use 'hours' array
  const availableTimes = [];
  
  nonEventShifts.forEach(shift => {
    // Check if the shift has a times array
    if (shift.times && Array.isArray(shift.times)) {
      shift.times.forEach(time => {
        // Handle both object format {time: 12.5} and direct decimal format 12.5
        const timeValue = typeof time === 'object' ? time.time : time;
        if (typeof timeValue === 'number' && timeValue >= 0) {
          availableTimes.push(timeValue);
        }
      });
    }
  });

  // Remove duplicates and sort the times
  return [...new Set(availableTimes)].sort((a, b) => a - b);
};

/**
 * Filters Event shift times to only include times that are available in non-Event shifts
 * 
 * @param {Array} eventShiftTimes - Array of times from an Event shift
 * @param {Array} availableTimes - Array of available times from non-Event shifts
 * @returns {Array} - Filtered array of Event shift times
 */
export const filterEventTimes = (eventShiftTimes, availableTimes) => {
  // Handle edge cases
  if (!eventShiftTimes || !Array.isArray(eventShiftTimes) || eventShiftTimes.length === 0) {
    return [];
  }
  
  if (!availableTimes || !Array.isArray(availableTimes) || availableTimes.length === 0) {
    return [];
  }

  // Filter event times to only include those that are in the available times
  return eventShiftTimes.filter(time => {
    // Handle both object format {time: 12.5} and direct decimal format 12.5
    const timeValue = typeof time === 'object' ? time.time : time;
    return availableTimes.includes(timeValue);
  });
};
