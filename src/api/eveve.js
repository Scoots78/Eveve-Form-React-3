import axios from 'axios';

// Create axios instance for Eveve API calls
const eveveApi = axios.create({
  timeout: 10000, // 10 second timeout
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  }
});

// Base URLs for different environments
const BASE_URLS = {
  NZ: 'https://nz.eveve.com',
  UK: 'https://uk6.eveve.com',
  US: 'https://us12.eveve.com',
  APP: 'https://app.eveve.com',
  STRIPE: 'https://api.stripe.com/v1',
};

/**
 * HOLD - Reserve a booking slot
 * @param {Object} params - Query parameters
 * @param {string} params.est - Establishment code (e.g., 'TestNZA')
 * @param {string} params.lng - Language code (e.g., 'en')
 * @param {number} params.covers - Number of guests
 * @param {string} params.date - Date in YYYY-MM-DD format
 * @param {number} params.time - Time (e.g., 16 for 4:00 PM)
 * @param {number} params.area - Area code
 * @returns {Promise} - API response promise
 */
export const hold = (params) => {
  return eveveApi.get(`${BASE_URLS.NZ}/web/hold`, { params });
};

/**
 * PI-GET - Get Stripe client_secret and public_key
 * @param {Object} params - Query parameters
 * @param {string} params.est - Establishment code
 * @param {number} params.uid - Booking UID
 * @param {number} params.type - Type (usually 0)
 * @param {string} params.desc - Description (customer name or identifier)
 * @param {number} params.created - Booking creation timestamp
 * @returns {Promise} - API response promise
 */
export const piGet = (params) => {
  return eveveApi.get(`${BASE_URLS.UK}/int/pi-get`, { params });
};

/**
 * DEPOSIT-GET - Determine deposit rules and amount
 * @param {Object} params - Query parameters
 * @param {string} params.est - Establishment code
 * @param {number} params.UID - Booking UID
 * @param {number} params.created - Booking creation timestamp
 * @param {string} params.lang - Language (e.g., 'english')
 * @param {number} params.type - Type (usually 0)
 * @returns {Promise} - API response promise
 */
export const depositGet = (params) => {
  return eveveApi.get(`${BASE_URLS.UK}/int/deposit-get`, { params });
};

/**
 * PM-ID - Attach payment method to intent
 * @param {Object} params - Query parameters
 * @param {string} params.est - Establishment code
 * @param {number} params.uid - Booking UID
 * @param {number} params.created - Booking creation timestamp
 * @param {string} params.pm - Stripe payment method ID
 * @param {number} params.total - Amount in cents
 * @param {number} params.totalFloat - Amount in dollars
 * @param {number} params.type - Type (usually 0)
 * @returns {Promise} - API response promise
 */
export const pmId = (params) => {
  return eveveApi.get(`${BASE_URLS.UK}/int/pm-id`, { params });
};

/**
 * UPDATE - Update booking with customer details
 * @param {Object} params - Query parameters
 * @param {string} params.est - Establishment code
 * @param {number} params.uid - Booking UID
 * @param {string} params.lng - Language code
 * @param {string} params.lastName - Customer last name
 * @param {string} params.firstName - Customer first name
 * @param {string} params.phone - Customer phone number
 * @param {string} params.email - Customer email
 * @param {string} params.addons - Selected addons (optional)
 * @param {string} params.notes - Booking notes (optional)
 * @param {string} params.dietary - Dietary requirements (optional)
 * @param {string} params.allergies - Allergies (optional)
 * @param {string} params.bookopt - Booking options (optional)
 * @param {string} params.guestopt - Guest options (optional)
 * @param {number} params.optem - Opt-in email marketing (optional)
 * @returns {Promise} - API response promise
 */
export const update = (params) => {
  return eveveApi.get(`${BASE_URLS.NZ}/web/update`, { params });
};

/**
 * RESTORE - Booking Validation
 * @param {Object} params - Query parameters
 * @param {string} params.est - Establishment code
 * @param {number} params.uid - Booking UID
 * @param {number} params.type - Type (usually 0)
 * @returns {Promise} - API response promise
 */
export const restore = (params) => {
  return eveveApi.get(`${BASE_URLS.UK}/api/restore`, { params });
};

// Handle API errors
eveveApi.interceptors.response.use(
  response => response,
  error => {
    console.error('Eveve API Error:', error.message);
    return Promise.reject(error);
  }
);

// Export all API functions
export default {
  hold,
  piGet,
  depositGet,
  pmId,
  update,
  restore,
};
