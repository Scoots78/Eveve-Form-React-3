/**
 * Event Month Availability Utilities
 * Handles fetching and parsing month availability specifically for events
 */

/**
 * Calculate the midpoint time from an event's available time range
 * @param {Object} event - Event object with avail array or early/late times
 * @returns {number} - Decimal time representing the midpoint
 */
export function calculateEventMidpointTime(event) {
  if (event.avail && Array.isArray(event.avail) && event.avail.length > 0) {
    // Use the midpoint of the avail array
    const sortedTimes = [...event.avail].sort((a, b) => a - b);
    const midIndex = Math.floor(sortedTimes.length / 2);
    return sortedTimes[midIndex];
  } else if (event.early !== undefined && event.late !== undefined) {
    // Fallback to midpoint between early and late
    return (event.early + event.late) / 2;
  } else {
    // Default fallback time (6:30 PM)
    return 18.5;
  }
}

/**
 * Fetch month availability for a specific event
 * @param {string} est - Restaurant UID
 * @param {Object} event - Event object
 * @param {string} baseApiUrl - Base API URL
 * @param {string} monthDate - Date string for the month (YYYY-MM-01 format)
 * @param {number} covers - Number of guests (default 2)
 * @returns {Promise<Object>} - Month availability response
 */
export async function fetchEventMonthAvailability(est, event, baseApiUrl, monthDate, covers = 2) {
  const midpointTime = calculateEventMidpointTime(event);
  
  const apiUrl = `${baseApiUrl}/web/month-avail?est=${est}&covers=${covers}&date=${monthDate}&time=${midpointTime}&event=${event.uid}`;
  
  console.log(`Fetching event month availability: ${apiUrl}`);
  
  try {
    const response = await fetch(apiUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch event availability. Status: ${response.status}`);
    }
    const data = await response.json();
    console.log('Event month availability response:', data);
    return data;
  } catch (error) {
    console.error('Error fetching event month availability:', error);
    throw error;
  }
}

/**
 * Parse event month availability response to get available dates
 * @param {Object} monthAvailResponse - Response from month-avail API
 * @param {number} eventUid - UID of the event to extract availability for
 * @param {number} year - Year for date generation
 * @param {number} month - Month for date generation (1-based)
 * @returns {Date[]} - Array of available Date objects
 */
export function parseEventAvailableDates(monthAvailResponse, eventUid, year, month) {
  if (!monthAvailResponse || !monthAvailResponse.events) {
    console.warn('No events data in month availability response');
    return [];
  }

  // Find the event in the response
  const eventData = monthAvailResponse.events.find(e => e.uid === eventUid);
  if (!eventData || !eventData.avail) {
    console.warn(`Event ${eventUid} not found in month availability response`);
    return [];
  }

  const availableDates = [];
  const availArray = eventData.avail;

  // Convert avail codes to actual dates
  // Codes 1, 2, 3 indicate availability (according to the docs)
  availArray.forEach((availCode, dayIndex) => {
    if (availCode === 1 || availCode === 2 || availCode === 3) {
      // Day index is 0-based, but we need 1-based day
      const dayOfMonth = dayIndex + 1;
      
      // Create date object for this available day
      const date = new Date(year, month - 1, dayOfMonth); // month-1 because Date constructor uses 0-based months
      availableDates.push(date);
    }
  });

  console.log(`Found ${availableDates.length} available dates for event ${eventUid}:`, availableDates);
  return availableDates;
}

/**
 * Check if a specific date is available for an event based on month availability
 * @param {Object} monthAvailResponse - Response from month-avail API
 * @param {number} eventUid - UID of the event
 * @param {Date} date - Date to check
 * @returns {boolean} - True if date is available
 */
export function isDateAvailableForEvent(monthAvailResponse, eventUid, date) {
  if (!monthAvailResponse || !monthAvailResponse.events) {
    return false;
  }

  const eventData = monthAvailResponse.events.find(e => e.uid === eventUid);
  if (!eventData || !eventData.avail) {
    return false;
  }

  // Get the day of month (1-based) and convert to 0-based index
  const dayOfMonth = date.getDate();
  const dayIndex = dayOfMonth - 1;

  if (dayIndex < 0 || dayIndex >= eventData.avail.length) {
    return false;
  }

  const availCode = eventData.avail[dayIndex];
  return availCode === 1 || availCode === 2 || availCode === 3;
}