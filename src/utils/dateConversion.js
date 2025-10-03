// src/utils/dateConversion.js

/**
 * Converts an Excel/Windows epoch-style date serial to a JavaScript Date object.
 * Excel dates are stored as the number of days since 1 January 1900.
 * Note: Excel incorrectly treats 1900 as a leap year, so dates before March 1, 1900 may be off by one day.
 * 
 * @param {number} serial - The Excel date serial number (e.g., 45931 = October 3, 2025)
 * @returns {Date} JavaScript Date object
 */
export function excelSerialToDate(serial) {
  // Excel epoch starts at January 1, 1900
  // JavaScript Date uses milliseconds since January 1, 1970
  // Excel incorrectly considers 1900 a leap year, so we need to account for this
  
  // Days between 1900-01-01 and 1970-01-01 = 25569
  // But Excel has an extra day due to the 1900 leap year bug, so we use 25568
  const excelEpoch = new Date(1899, 11, 30); // December 30, 1899 (to account for Excel bug)
  const jsDate = new Date(excelEpoch.getTime() + serial * 86400000); // 86400000 ms in a day
  
  return jsDate;
}

/**
 * Generates an array of Date objects for each day in a date range (inclusive).
 * 
 * @param {number} fromSerial - Excel serial for start date
 * @param {number} toSerial - Excel serial for end date
 * @returns {Date[]} Array of Date objects for each day in the range
 */
export function generateDateRange(fromSerial, toSerial) {
  const dates = [];
  for (let serial = fromSerial; serial <= toSerial; serial++) {
    dates.push(excelSerialToDate(serial));
  }
  return dates;
}

/**
 * Checks if a given date matches any of the event dates.
 * 
 * @param {Date} date - The date to check
 * @param {Date[]} eventDates - Array of event dates
 * @returns {boolean} True if the date matches an event date
 */
export function isEventDate(date, eventDates) {
  if (!date || !Array.isArray(eventDates)) return false;
  
  const targetDate = new Date(date);
  targetDate.setHours(0, 0, 0, 0);
  
  return eventDates.some(eventDate => {
    const compareDate = new Date(eventDate);
    compareDate.setHours(0, 0, 0, 0);
    return compareDate.getTime() === targetDate.getTime();
  });
}
