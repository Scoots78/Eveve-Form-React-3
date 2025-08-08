import { useState, useCallback } from 'react';
import * as eveveApi from '../../api/eveve';
import * as stripeApi from '../../api/stripe';

/**
 * Custom hook for handling Stripe payment flow in the booking process
 * 
 * @param {string} baseUrl - Base API URL (optional, defaults to UK endpoint)
 * @returns {Object} Hook methods and state
 */
export function useStripePayment(baseUrl = 'https://uk6.eveve.com') {
  // State for tracking loading, errors, and results
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [stripeKeys, setStripeKeys] = useState(null);
  const [depositInfo, setDepositInfo] = useState(null);
  const [paymentMethodId, setPaymentMethodId] = useState(null);
  const [paymentComplete, setPaymentComplete] = useState(false);

  /**
   * Fetch Stripe keys from Eveve's pi-get endpoint
   * 
   * @param {Object} params - Parameters for the request
   * @param {string} params.est - Establishment code
   * @param {string} params.uid - Booking UID
   * @param {number} params.created - Booking creation timestamp
   * @param {string} params.desc - Customer description (optional)
   * @returns {Promise<Object>} - Stripe keys and client secret
   */
  const fetchStripeKeys = useCallback(async (params) => {
    // If we've already fetched keys for this booking UID, reuse them
    if (stripeKeys && stripeKeys.clientSecret && params?.uid === stripeKeys?.uid) {
      console.log('🔑 Re-using Stripe keys for UID:', params.uid);
      return stripeKeys;
    }

    console.log('🔑 Fetching Stripe keys for UID:', params.uid);
    setIsLoading(true);
    setError(null);
    
    try {
      // Create a friendly customer description for Stripe if not provided
      const customerDescription =
        params.desc ||
        [
          params.firstName,
          params.lastName,
          params.email
        ]
          .filter(Boolean)
          .join('_');
      
      const piGetParams = {
        est: params.est,
        uid: params.uid,
        type: 0, // Default type for both setup and payment intents
        desc: customerDescription,
        created: params.created
      };
      
      const response = await eveveApi.piGet(piGetParams);
      
      if (!response.data.client_secret || !response.data.public_key) {
        throw new Error('Missing Stripe keys in pi-get response');
      }
      
      const keys = {
        clientSecret: response.data.client_secret,
        publicKey: response.data.public_key,
        cust: response.data.cust
      };
      
      // Determine intent type for debugging
      const intentType = stripeApi.getIntentType(keys.clientSecret);
      console.log(`🔑 Got ${intentType} (${intentType === 'setup_intent' ? 'no-show protection' : 'immediate charge'})`);
      
      setStripeKeys(keys);
      // Keep uid so we know which booking the keys belong to
      keys.uid = params.uid;
      
      // Initialize Stripe with the public key
      await stripeApi.initializeStripe(keys.publicKey);
      
      return keys;
    } catch (err) {
      console.error('❌ Error fetching Stripe keys:', err.message);
      setError(err.message || 'Failed to retrieve Stripe keys');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Fetch deposit information to determine if this is a deposit or no-show protection
   * 
   * @param {Object} params - Parameters for the request
   * @param {string} params.est - Establishment code
   * @param {string} params.uid - Booking UID
   * @param {number} params.created - Booking creation timestamp
   * @param {string} params.lang - Language (default: 'english')
   * @returns {Promise<Object>} - Deposit information
   */
  const fetchDepositInfo = useCallback(async (params) => {
    console.log('💰 Fetching deposit info for UID:', params.uid);
    setIsLoading(true);
    setError(null);
    
    try {
      const depositParams = {
        est: params.est,
        UID: params.uid,
        created: params.created,
        lang: params.lang || 'english',
        type: 0
      };
      
      const response = await eveveApi.depositGet(depositParams);
      
      if (!response.data.ok) {
        throw new Error('Deposit-get request failed');
      }
      
      const info = {
        isDeposit: response.data.code === 2, // code 2 = deposit, code 1 = no-show
        isNoShow: response.data.code === 1,
        amount: response.data.total,
        amountFormatted: response.data.amount,
        currency: response.data.currency,
        message: response.data.message
      };
      
      console.log(`💰 Deposit info: ${info.isDeposit ? 'DEPOSIT' : 'NO-SHOW'}, amount: ${info.amount} cents (${info.currency})`);
      
      setDepositInfo(info);
      return info;
    } catch (err) {
      console.error('❌ Error fetching deposit information:', err.message);
      setError(err.message || 'Failed to retrieve deposit information');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Process payment with Stripe
   * 
   * @param {Object} params - Parameters for the payment
   * @param {Object} params.cardElement - Stripe CardElement instance
   * @param {Object} params.billingDetails - Customer billing details
   * @param {string} params.billingDetails.name - Customer name
   * @param {string} params.billingDetails.email - Customer email
   * @returns {Promise<Object>} - Payment result with payment method ID
   */
  const processPayment = useCallback(async (params) => {
    if (!stripeKeys || !stripeKeys.clientSecret) {
      console.error('❌ Stripe keys not initialized');
      throw new Error('Stripe keys not initialized. Call fetchStripeKeys first.');
    }
    
    if (!params.cardElement) {
      console.error('❌ Card element is missing');
      throw new Error('Card element is required for payment processing');
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Get the Stripe instance
      const stripe = await stripeApi.getStripe();
      
      if (!stripe) {
        throw new Error('Stripe.js has not loaded yet');
      }
      
      // Determine the intent type from the client secret
      const intentType = stripeApi.getIntentType(stripeKeys.clientSecret);
      
      let result;
      
      // Process payment based on intent type
      if (intentType === 'setup_intent') {
        // No-show protection - just store the card
        console.log('💳 CALLING: confirmCardSetup (NO-SHOW PROTECTION)');
        
        result = await stripe.confirmCardSetup(stripeKeys.clientSecret, {
          payment_method: {
            card: params.cardElement,
            billing_details: params.billingDetails
          }
        });
      } else {
        // Deposit - charge the card now
        console.log('💳 CALLING: confirmCardPayment (IMMEDIATE CHARGE)');
        
        result = await stripe.confirmCardPayment(stripeKeys.clientSecret, {
          payment_method: {
            card: params.cardElement,
            billing_details: params.billingDetails
          }
        });
      }
      
      if (result.error) {
        // Show error to your customer
        throw result.error;
      }
      
      // Payment or setup successful
      const pmId = intentType === 'setup_intent' 
        ? result.setupIntent.payment_method
        : result.paymentIntent.payment_method;
      
      console.log(`✅ Payment processed successfully (${intentType})`);
      
      // Store the payment method ID
      setPaymentMethodId(pmId);
      
      return {
        success: true,
        paymentMethodId: pmId,
        intentType,
        status: intentType === 'setup_intent' ? result.setupIntent.status : result.paymentIntent.status
      };
    } catch (err) {
      console.error('❌ Payment processing failed:', err.message);
      setError(err.message || 'Payment processing failed');
      
      return {
        success: false,
        error: err.message,
        errorDetails: stripeApi.handleStripeError(err)
      };
    } finally {
      setIsLoading(false);
    }
  }, [stripeKeys]);

  /**
   * Attach payment method to booking
   * 
   * @param {Object} params - Parameters for the request
   * @param {string} params.est - Establishment code
   * @param {string} params.uid - Booking UID
   * @param {number} params.created - Booking creation timestamp
   * @param {string} params.paymentMethodId - Stripe payment method ID
   * @param {number} params.total - Amount in cents
   * @returns {Promise<Object>} - Result of attaching payment method
   */
  const attachPaymentMethod = useCallback(async (params) => {
    if (!params.paymentMethodId) {
      console.error('❌ No payment method ID provided');
      throw new Error('No payment method available to attach');
    }
    
    console.log(`🔗 Attaching payment method to booking (${params.total} cents)`);
    setIsLoading(true);
    setError(null);
    
    try {
      // Validate booking exists first (optional but recommended)
      await eveveApi.restore({
        est: params.est,
        uid: params.uid,
        type: 0
      });
      
      // Call pm-id to attach the payment method to the booking
      const pmIdParams = {
        est: params.est,
        uid: params.uid,
        created: params.created,
        pm: params.paymentMethodId,
        total: params.total,
        totalFloat: params.total / 100,
        type: 0
      };
      
      const response = await eveveApi.pmId(pmIdParams);
      
      if (!response.data.ok) {
        throw new Error('Failed to attach payment method to booking');
      }
      
      console.log(`✅ Payment method attached successfully (${response.data.total} cents)`);
      setPaymentComplete(true);
      
      return {
        success: true,
        isDeposit: response.data.code === 2,
        isNoShow: response.data.code === 1,
        amount: response.data.total,
        currency: response.data.currency,
        message: response.data.message
      };
    } catch (err) {
      console.error('❌ Failed to attach payment method:', err.message);
      setError(err.message || 'Failed to attach payment method');
      
      return {
        success: false,
        error: err.message
      };
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Complete the full payment flow (fetch keys, process payment, attach payment method)
   * 
   * @param {Object} params - All parameters needed for the payment flow
   * @param {string} params.est - Establishment code
   * @param {string} params.uid - Booking UID
   * @param {number} params.created - Booking creation timestamp
   * @param {string} params.firstName - Customer first name
   * @param {string} params.lastName - Customer last name
   * @param {string} params.email - Customer email
   * @param {Object} params.cardElement - Stripe CardElement instance
   * @param {Object} [params.preCalculatedDeposit=null] - Optional pre-calculated
   *        deposit info (when shift.charge = 2).  If provided the hook will skip
   *        the Eveve `deposit-get` call and use this object instead.  Expected
   *        shape: { isDeposit:boolean, isNoShow:boolean, amount:number,
   *        currency:string }
   * @returns {Promise<Object>} - Result of the payment flow
   */
  const completePaymentFlow = useCallback(async (params) => {
    console.log('🔄 Starting payment flow for UID:', params.uid);
    
    if (params.preCalculatedDeposit) {
      console.log(`💰 Using PRE-CALCULATED deposit: ${params.preCalculatedDeposit.amount} cents (shift.charge=2)`);
    }
    
    try {
      // Step 1: Fetch Stripe keys (only if not already fetched)
      let keys = stripeKeys;
      
      if (!keys) {
        keys = await fetchStripeKeys({
          est: params.est,
          uid: params.uid,
          created: params.created,
          desc: `${params.firstName}_${params.lastName}_-_${params.email}`,
          firstName: params.firstName,
          lastName: params.lastName,
          email: params.email
        });
      }
      
      // Determine intent type for logging
      const intentType = stripeApi.getIntentType(keys.clientSecret);
      
      // Step 2: Deposit information
      let depositInfo;
      if (params.preCalculatedDeposit) {
        console.log('💰 SKIPPING deposit-get API call, using pre-calculated amount');
        depositInfo = params.preCalculatedDeposit;
      } else {
        console.log('💰 Calling deposit-get API for deposit info');
        depositInfo = await fetchDepositInfo({
          est: params.est,
          uid: params.uid,
          created: params.created
        });
      }
      
      // Log intent type vs deposit info mismatch warning if needed
      if ((depositInfo.isDeposit && intentType === 'payment_intent') || 
          (depositInfo.isNoShow && intentType === 'setup_intent')) {
        // Good match, no need to log
      } else {
        console.warn('⚠️ Intent type does not match deposit info - may cause issues');
      }
      
      // Step 3: Process payment
      console.log(`💳 Processing payment: ${depositInfo.isDeposit ? 'CHARGE NOW' : 'STORE CARD'}, amount: ${depositInfo.amount} cents`);
      
      const paymentResult = await processPayment({
        cardElement: params.cardElement,
        billingDetails: {
          name: `${params.firstName} ${params.lastName}`,
          email: params.email
        }
      });
      
      if (!paymentResult.success) {
        console.error('❌ Payment processing failed:', paymentResult.error);
        return paymentResult;
      }
      
      // Step 4: Attach payment method
      console.log(`🔗 Attaching payment method to booking (${depositInfo.amount} cents)`);
      
      const attachResult = await attachPaymentMethod({
        est: params.est,
        uid: params.uid,
        created: params.created,
        paymentMethodId: paymentResult.paymentMethodId,
        total: depositInfo.amount
      });
      
      if (!attachResult.success) {
        console.error('❌ Payment method attachment failed:', attachResult.error);
        return attachResult;
      }
      
      console.log(`✅ Payment flow completed successfully: ${depositInfo.isDeposit ? 'CHARGED' : 'STORED'} ${depositInfo.amount} cents`);
      
      // Return comprehensive result
      return {
        success: true,
        paymentMethodId: paymentResult.paymentMethodId,
        isDeposit: depositInfo.isDeposit,
        isNoShow: depositInfo.isNoShow,
        amount: depositInfo.amount,
        currency: depositInfo.currency,
        status: paymentResult.status,
        intentType: paymentResult.intentType,
        message: attachResult.message || depositInfo.message
      };
    } catch (err) {
      console.error('❌ Payment flow failed:', err.message);
      setError(err.message || 'Payment flow failed');
      
      return {
        success: false,
        error: err.message,
        errorDetails: err.stack
      };
    }
  }, [fetchStripeKeys, fetchDepositInfo, processPayment, attachPaymentMethod, stripeKeys]);

  /**
   * Reset all state
   */
  const reset = useCallback(() => {
    console.log('Resetting Stripe payment state');
    setIsLoading(false);
    setError(null);
    setStripeKeys(null);
    setDepositInfo(null);
    setPaymentMethodId(null);
    setPaymentComplete(false);
  }, []);

  return {
    // State
    isLoading,
    error,
    stripeKeys,
    depositInfo,
    paymentMethodId,
    paymentComplete,
    
    // Methods
    fetchStripeKeys,
    fetchDepositInfo,
    processPayment,
    attachPaymentMethod,
    completePaymentFlow,
    reset
  };
}

export default useStripePayment;
