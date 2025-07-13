/**
 * Utility functions for fetching and processing month availability data from Eveve API
 */

// Default number of covers (guests) to use when checking month availability
// This is kept constant regardless of actual guest selection
export const defaultCoversForMonthAvail = 2;

/**
 * Fetches availability data for a specific month from the Eveve API
 * 
 * @param {string} est - Establishment ID
 * @param {number} year - Year (YYYY)
 * @param {number} month - Month (1-12)
 * @param {string} baseApiUrl - Base API URL (defaults to "https://nz.eveve.com")
 * @returns {Promise<Object>} - Month availability data
 */
export const fetchMonthAvailability = async (est, year, month, baseApiUrl = "https://nz.eveve.com") => {
  try {
    // Format date as YYYY-MM-01 (first day of month)
    const formattedDate = `${year}-${month.toString().padStart(2, '0')}-01`;
    
    console.log(`Fetching month availability for: ${formattedDate}`);
    
    // Make API request to month-avail endpoint
    const response = await fetch(
      `${baseApiUrl}/web/month-avail?est=${est}&covers=${defaultCoversForMonthAvail}&date=${formattedDate}`
    );
    
    if (!response.ok) {
      throw new Error(`Month availability API error: ${response.status} ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Failed to fetch month availability for ${year}-${month}:`, error);
    return null;
  }
};

/**
 * Parses the month availability response to identify closed dates
 * 
 * @param {Object} monthData - Response from month-avail API
 * @param {number} year - Year (YYYY)
 * @param {number} month - Month (1-12)
 * @returns {Date[]} - Array of Date objects representing closed dates
 */
export const parseClosedDatesFromMonthResponse = (monthData, year, month) => {
  if (!monthData || !monthData.times || !Array.isArray(monthData.times)) {
    console.error('Invalid month data format', monthData);
    return [];
  }
  
  const closedDates = [];
  
  // Iterate through each day in the times array
  monthData.times.forEach((dayData, index) => {
    // A day is closed if the first element (primary availability array) is empty
    // The structure for closed days is typically: [[],[],[[],[],[],[]],[],""]]
    const isDayClosed = Array.isArray(dayData[0]) && dayData[0].length === 0;
    
    if (isDayClosed) {
      // Index is 0-based, so add 1 to get the actual day of month
      const day = index + 1;
      // Create a Date object for the closed date
      // Note: Month in JS Date is 0-based, so subtract 1
      const closedDate = new Date(year, month - 1, day);
      closedDates.push(closedDate);
    }
  });
  
  console.log(`Found ${closedDates.length} closed dates for ${year}-${month}`);
  return closedDates;
};

/**
 * Fetches availability data for multiple consecutive months
 * 
 * @param {string} est - Establishment ID
 * @param {Date} startDate - Starting date
 * @param {number} monthCount - Number of months to fetch (default: 3)
 * @param {string} baseApiUrl - Base API URL
 * @returns {Promise<Date[]>} - Combined array of all closed dates
 */
export const fetchMultipleMonthsAvailability = async (
  est, 
  startDate = new Date(), 
  monthCount = 3,
  baseApiUrl = "https://nz.eveve.com"
) => {
  try {
    const allClosedDates = [];
    let currentDate = new Date(startDate);
    
    // Fetch data for each month
    for (let i = 0; i < monthCount; i++) {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1; // Convert from 0-based to 1-based
      
      const monthData = await fetchMonthAvailability(est, year, month, baseApiUrl);
      
      if (monthData) {
        const closedDates = parseClosedDatesFromMonthResponse(monthData, year, month);
        allClosedDates.push(...closedDates);
      }
      
      // Move to next month
      currentDate.setMonth(currentDate.getMonth() + 1);
    }
    
    console.log(`Fetched availability for ${monthCount} months, found ${allClosedDates.length} total closed dates`);
    return allClosedDates;
  } catch (error) {
    console.error('Failed to fetch multiple months availability:', error);
    return [];
  }
};
