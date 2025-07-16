import { useState } from 'react';

/**
 * Custom hook for finalizing a booking through the Eveve /web/book API
 * 
 * @param {string} baseUrl - Base API URL (e.g. https://nz.eveve.com)
 * @returns {Object} Hook methods and state
 */
export function useBookReservation(baseUrl) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [bookingResult, setBookingResult] = useState(null);

  /**
   * Finalize a booking with a hold token
   * 
   * @param {string} holdToken - Token from the hold response
   * @returns {Promise<Object>} - Booking confirmation data
   */
  const bookReservation = async (holdToken) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Build the URL with query parameters
      const url = new URL(`${baseUrl}/web/book`);
      
      // Add hold token
      url.searchParams.append("uid", holdToken);
      
      console.log("Book Reservation Request URL:", url.toString());
      
      const response = await fetch(url);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Booking request failed: ${response.status} ${errorText}`);
      }
      
      const data = await response.json();
      
      if (!data.ok) {
        throw new Error(data.message || "Booking request failed with API error");
      }
      
      // Store the successful booking result
      setBookingResult(data);
      return data;
    } catch (err) {
      console.error("Error during booking request:", err);
      setError(err.message || "Failed to finalize booking");
      throw err;
    } finally {
      setIsLoading(false);
    }
  };
  
  /**
   * Clear the current booking result
   */
  const clearBookingResult = () => {
    setBookingResult(null);
    setError(null);
  };
  
  return {
    bookReservation,
    clearBookingResult,
    isLoading,
    error,
    bookingResult
  };
}
