import { useState } from 'react';

/**
 * Custom hook for updating a held booking with customer details
 * through the Eveve /web/update API
 * 
 * @param {string} baseUrl - Base API URL (e.g. https://nz.eveve.com)
 * @returns {Object} Hook methods and state
 */
export function useUpdateHold(baseUrl) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [updateResult, setUpdateResult] = useState(null);

  /**
   * Update a held booking with customer details
   * 
   * @param {string} holdToken - Token from the hold response
   * @param {Object} customerData - Customer details
   * @param {string} customerData.firstName - Customer first name
   * @param {string} customerData.lastName - Customer last name
   * @param {string} customerData.email - Customer email address
   * @param {string} customerData.phone - Customer phone number
   * @param {string} [customerData.notes] - Optional booking notes
   * @param {boolean} [customerData.optin] - Mailing list opt-in (default true)
   * @param {Object} [customerData.allergy] - Allergy information
   * @param {boolean} customerData.allergy.has - Whether the customer has allergies
   * @param {string} customerData.allergy.details - Allergy details if has=true
   * @returns {Promise<Object>} - Update response data
   */
  const updateHold = async (holdToken, customerData) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Build the URL with query parameters
      const url = new URL(`${baseUrl}/web/update`);
      
      // Add hold token
      url.searchParams.append("uid", holdToken);
      
      // Add customer details
      url.searchParams.append("fname", customerData.firstName);
      url.searchParams.append("lname", customerData.lastName);
      url.searchParams.append("email", customerData.email);
      url.searchParams.append("phone", customerData.phone);
      
      // Add optional parameters
      if (customerData.notes) {
        url.searchParams.append("notes", customerData.notes);
      }
      
      // Opt-in is true by default unless explicitly set to false
      const optinValue = customerData.optin !== false ? 1 : 0;
      url.searchParams.append("optin", optinValue);
      
      // Handle allergy information if present
      if (customerData.allergy) {
        url.searchParams.append("allergy", customerData.allergy.has ? 1 : 0);
        if (customerData.allergy.has && customerData.allergy.details) {
          url.searchParams.append("allergytext", customerData.allergy.details);
        }
      }
      
      console.log("Update Hold Request URL:", url.toString());
      
      const response = await fetch(url);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Update request failed: ${response.status} ${errorText}`);
      }
      
      const data = await response.json();
      
      if (!data.ok) {
        throw new Error(data.message || "Update request failed with API error");
      }
      
      // Store the successful update result
      setUpdateResult(data);
      return data;
    } catch (err) {
      console.error("Error during update request:", err);
      setError(err.message || "Failed to update booking");
      throw err;
    } finally {
      setIsLoading(false);
    }
  };
  
  /**
   * Clear the current update result
   */
  const clearUpdateResult = () => {
    setUpdateResult(null);
    setError(null);
  };
  
  return {
    updateHold,
    clearUpdateResult,
    isLoading,
    error,
    updateResult
  };
}
