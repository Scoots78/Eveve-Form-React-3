// Date conversion utilities

/**
 * Converts an Excel/Windows epoch-style date serial to a JavaScript Date object.
 * Based on analysis of sample data, the system uses January 1, 1900 as the epoch.
 * Sample mappings: 45933 = 05/10/2025, 45899 = 01/09/2025, etc.
 * 
 * @param {number} serial - The Excel date serial number (e.g., 45933 = May 10, 2025)
 * @returns {Date} JavaScript Date object
 */
export function excelSerialToDate(serial) {
  // Based on sample data analysis, the epoch appears to be January 1, 1900
  // This gives us the correct mapping for the provided sample dates
  // 45933 = 05/10/2025, 45899 = 01/09/2025, etc.
  
  const excelEpoch = new Date(1900, 0, 1); // January 1, 1900
  const jsDate = new Date(excelEpoch.getTime() + serial * 86400000); // 86400000 ms in a day
  
  return jsDate;
}

/**
 * Converts a JavaScript Date object to an Excel serial number (1900 epoch system)
 * @param {Date} date - JavaScript Date object
 * @returns {number} Excel date serial number
 */
export function dateToExcelSerial(date) {
  const excelEpoch = new Date(1900, 0, 1); // January 1, 1900
  const diffTime = date.getTime() - excelEpoch.getTime();
  const diffDays = Math.floor(diffTime / 86400000); // 86400000 ms in a day
  return diffDays;
}

/**
 * Get current date as Excel serial number (1900 epoch system)
 * @returns {number} Current date as Excel serial
 */
export function getCurrentExcelSerial() {
  return dateToExcelSerial(new Date());
}

/**
 * Helper function to format date for debugging
 * @param {number} serial - Excel serial number
 * @returns {string} Formatted date string for debugging
 */
export function formatExcelSerialForDebug(serial) {
  const date = excelSerialToDate(serial);
  return `${serial} = ${date.toLocaleDateString('en-GB')} (${date.toDateString()})`;
}

/**
 * Convert first available date serial to a JavaScript Date
 * Used for event sorting by first available date
 * @param {number[]} availDates - Array of Excel serial numbers
 * @returns {Date|null} First available date as JavaScript Date, or null if none
 */
export function convertFirstAvailDate(availDates) {
  if (!availDates || availDates.length === 0) {
    return null;
  }
  
  // Find the earliest (smallest) serial number
  const earliestSerial = Math.min(...availDates);
  return excelSerialToDate(earliestSerial);
}

/**
 * Generates an array of Date objects for each day in a date range (inclusive).
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