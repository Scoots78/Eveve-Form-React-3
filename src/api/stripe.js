import { loadStripe } from '@stripe/stripe-js';

// Store the Stripe instance once loaded
let stripeInstance = null;

/**
 * Initialize Stripe with the public key
 * @param {string} publicKey - Stripe public key from Eveve
 * @returns {Promise<Stripe>} - Initialized Stripe instance
 */
export const initializeStripe = async (publicKey) => {
  try {
    if (!publicKey) {
      throw new Error('Stripe public key is required');
    }

    // Load and initialize Stripe
    stripeInstance = await loadStripe(publicKey);
    return stripeInstance;
  } catch (error) {
    console.error('Error initializing Stripe:', error);
    throw error;
  }
};

/**
 * Get the current Stripe instance or initialize a new one
 * @param {string} publicKey - Stripe public key (optional if already initialized)
 * @returns {Promise<Stripe>} - Stripe instance
 */
export const getStripe = async (publicKey = null) => {
  if (stripeInstance) return stripeInstance;
  if (!publicKey) throw new Error('Stripe not initialized and no public key provided');
  return initializeStripe(publicKey);
};

/**
 * Confirm a Stripe Setup Intent (for no-show protection)
 * @param {string} clientSecret - The client secret from the SetupIntent
 * @param {Object} paymentMethod - The payment method data or ID
 * @param {Object} options - Additional confirmation options
 * @returns {Promise<Object>} - The confirmation result
 */
export const confirmSetupIntent = async (clientSecret, paymentMethod, options = {}) => {
  try {
    const stripe = await getStripe();
    
    if (!stripe) {
      throw new Error('Stripe not initialized');
    }

    // Determine if we have a payment method ID or element
    const paymentMethodParam = typeof paymentMethod === 'string' 
      ? { payment_method: paymentMethod } 
      : { payment_method: paymentMethod };
    
    // Confirm the setup intent
    const result = await stripe.confirmCardSetup(
      clientSecret,
      {
        ...paymentMethodParam,
        ...options
      }
    );
    
    return result;
  } catch (error) {
    console.error('Error confirming setup intent:', error);
    throw error;
  }
};

/**
 * Confirm a Stripe Payment Intent (for deposits)
 * @param {string} clientSecret - The client secret from the PaymentIntent
 * @param {Object} paymentMethod - The payment method data or ID
 * @param {Object} options - Additional confirmation options
 * @returns {Promise<Object>} - The confirmation result
 */
export const confirmPaymentIntent = async (clientSecret, paymentMethod, options = {}) => {
  try {
    const stripe = await getStripe();
    
    if (!stripe) {
      throw new Error('Stripe not initialized');
    }

    // Determine if we have a payment method ID or element
    const paymentMethodParam = typeof paymentMethod === 'string' 
      ? { payment_method: paymentMethod } 
      : { payment_method: paymentMethod };
    
    // Confirm the payment intent
    const result = await stripe.confirmCardPayment(
      clientSecret,
      {
        ...paymentMethodParam,
        ...options
      }
    );
    
    return result;
  } catch (error) {
    console.error('Error confirming payment intent:', error);
    throw error;
  }
};

/**
 * Handle Stripe error responses and format them for display
 * @param {Object} error - Stripe error object
 * @returns {Object} - Formatted error object
 */
export const handleStripeError = (error) => {
  // Extract the most relevant error information
  return {
    message: error.message || 'An unknown error occurred',
    code: error.code,
    type: error.type,
    decline_code: error.decline_code,
    param: error.param,
  };
};

/**
 * Determine if a client secret is for a SetupIntent or PaymentIntent
 * @param {string} clientSecret - The client secret from Eveve
 * @returns {string} - 'setup_intent' or 'payment_intent'
 */
export const getIntentType = (clientSecret) => {
  if (!clientSecret) return null;
  
  if (clientSecret.startsWith('seti_')) {
    return 'setup_intent';
  } else if (clientSecret.startsWith('pi_')) {
    return 'payment_intent';
  }
  
  // Try to infer from the secret format
  return clientSecret.includes('_seti_') ? 'setup_intent' : 'payment_intent';
};

/**
 * Confirm the appropriate intent type based on client secret
 * @param {string} clientSecret - The client secret from Eveve
 * @param {Object} paymentMethod - The payment method data or ID
 * @param {Object} options - Additional confirmation options
 * @returns {Promise<Object>} - The confirmation result
 */
export const confirmIntent = async (clientSecret, paymentMethod, options = {}) => {
  const intentType = getIntentType(clientSecret);
  
  if (intentType === 'setup_intent') {
    return confirmSetupIntent(clientSecret, paymentMethod, options);
  } else {
    return confirmPaymentIntent(clientSecret, paymentMethod, options);
  }
};

// Export all functions
export default {
  initializeStripe,
  getStripe,
  confirmSetupIntent,
  confirmPaymentIntent,
  handleStripeError,
  getIntentType,
  confirmIntent
};
