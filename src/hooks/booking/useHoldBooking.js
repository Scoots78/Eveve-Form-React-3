import { useState } from 'react';

/**
 * Custom hook for holding a booking through the Eveve /web/hold API
 * 
 * @param {string} baseUrl - Base API URL (e.g. https://nz.eveve.com)
 * @returns {Object} Hook methods and state
 */
export function useHoldBooking(baseUrl) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [holdData, setHoldData] = useState(null);

  /**
   * Hold a booking slot
   * 
   * @param {Object} bookingData - Data for the hold request
   * @param {string} bookingData.est - Restaurant ID
   * @param {string} bookingData.lng - Language
   * @param {number} bookingData.covers - Number of guests
   * @param {string} bookingData.date - Date (YYYY-MM-DD)
   * @param {number} bookingData.time - Time in decimal format (e.g. 19.5 for 7:30 PM)
   * @param {string} [bookingData.addons] - Comma-separated addon string
   * @param {string} [bookingData.area] - Area UID or "any"
   * @param {number|string} [bookingData.event] - Event ID when booking an event
   * @returns {Promise<Object>} - Hold response data
   */
  const holdBooking = async (bookingData) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Build the URL with query parameters
      const url = new URL(`${baseUrl}/web/hold`);
      
      // Add required parameters
      url.searchParams.append("est", bookingData.est);
      url.searchParams.append("lng", bookingData.lng || "en");
      url.searchParams.append("covers", bookingData.covers);
      url.searchParams.append("date", bookingData.date);
      url.searchParams.append("time", bookingData.time);
      
      // Add optional parameters if they exist
      if (bookingData.addons) {
        url.searchParams.append("addons", bookingData.addons);
      }
      
      // Only include area if it's a specific UID (not "any" which is default)
      if (bookingData.area && bookingData.area !== "any") {
        url.searchParams.append("area", bookingData.area);
      }

      // Include event ID when present to correctly flag event bookings
      if (bookingData.event !== undefined && bookingData.event !== null) {
        console.log(`Including event id ${bookingData.event} in hold request`);
        url.searchParams.append("event", bookingData.event);
      }
      
      console.log("Hold Request URL:", url.toString());
      
      const response = await fetch(url);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Hold request failed: ${response.status} ${errorText}`);
      }
      
      const data = await response.json();
      
      if (!data.ok) {
        throw new Error(data.message || "Hold request failed with API error");
      }
      
      // Store the successful hold data
      setHoldData(data);
      return data;
    } catch (err) {
      console.error("Error during hold request:", err);
      setError(err.message || "Failed to hold booking");
      throw err;
    } finally {
      setIsLoading(false);
    }
  };
  
  /**
   * Clear the current hold data
   */
  const clearHoldData = () => {
    setHoldData(null);
    setError(null);
  };
  
  return {
    holdBooking,
    clearHoldData,
    isLoading,
    error,
    holdData
  };
}
