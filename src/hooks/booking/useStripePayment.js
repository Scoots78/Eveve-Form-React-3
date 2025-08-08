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
    console.group('🔑 [useStripePayment] fetchStripeKeys');
    // If we've already fetched keys for this booking UID, reuse them
    if (stripeKeys && stripeKeys.clientSecret && params?.uid === stripeKeys?.uid) {
      console.log('Re-using previously fetched Stripe keys for UID:', params.uid);
      console.groupEnd();
      return stripeKeys;
    }

    console.log('Fetching Stripe keys with params:', {
      est: params.est,
      uid: params.uid,
      created: params.created,
      firstName: params.firstName,
      lastName: params.lastName,
      email: params.email
    });
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
      
      console.log('📤 API Call: pi-get with params:', piGetParams);
      const response = await eveveApi.piGet(piGetParams);
      console.log('📥 API Response: pi-get', {
        ok: response.data.ok,
        hasClientSecret: !!response.data.client_secret,
        hasPublicKey: !!response.data.public_key,
        hasCust: !!response.data.cust
      });
      
      if (!response.data.client_secret || !response.data.public_key) {
        throw new Error('Missing Stripe keys in pi-get response');
      }
      
      const keys = {
        clientSecret: response.data.client_secret,
        publicKey: response.data.public_key,
        cust: response.data.cust
      };
      
      console.log('Stripe keys retrieved successfully:', {
        clientSecret: keys.clientSecret ? `${keys.clientSecret.substring(0, 10)}...` : null,
        publicKey: keys.publicKey ? `${keys.publicKey.substring(0, 10)}...` : null,
        intentType: stripeApi.getIntentType(keys.clientSecret)
      });
      
      setStripeKeys(keys);
      // Keep uid so we know which booking the keys belong to
      keys.uid = params.uid;
      
      // Initialize Stripe with the public key
      await stripeApi.initializeStripe(keys.publicKey);
      console.log('Stripe initialized with public key');
      
      console.groupEnd();
      return keys;
    } catch (err) {
      console.error('❌ Error fetching Stripe keys:', err);
      setError(err.message || 'Failed to retrieve Stripe keys');
      console.groupEnd();
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
    console.group('💰 [useStripePayment] fetchDepositInfo');
    console.log('Fetching deposit info with params:', {
      est: params.est,
      uid: params.uid,
      created: params.created,
      lang: params.lang || 'english'
    });
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
      
      console.log('📤 API Call: deposit-get with params:', depositParams);
      const response = await eveveApi.depositGet(depositParams);
      console.log('📥 API Response: deposit-get', {
        ok: response.data.ok,
        code: response.data.code,
        total: response.data.total,
        amount: response.data.amount,
        currency: response.data.currency
      });
      
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
      
      console.log('Deposit info processed:', {
        isDeposit: info.isDeposit ? 'YES - Card will be charged now' : 'NO',
        isNoShow: info.isNoShow ? 'YES - Card stored for no-show protection' : 'NO',
        amount: info.amount,
        amountFormatted: info.amountFormatted,
        currency: info.currency,
        message: info.message
      });
      
      setDepositInfo(info);
      console.groupEnd();
      return info;
    } catch (err) {
      console.error('❌ Error fetching deposit information:', err);
      setError(err.message || 'Failed to retrieve deposit information');
      console.groupEnd();
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
    console.group('💳 [useStripePayment] processPayment');
    const label = `processPayment-${stripeKeys?.uid || 'n/a'}`;
    console.time(label);
    
    console.log('Processing payment with params:', {
      cardElementExists: !!params.cardElement,
      billingDetails: params.billingDetails,
      stripeKeysExist: !!stripeKeys,
      clientSecretExists: !!stripeKeys?.clientSecret
    });
    
    if (!stripeKeys || !stripeKeys.clientSecret) {
      console.error('Stripe keys not initialized');
      console.groupEnd();
      throw new Error('Stripe keys not initialized. Call fetchStripeKeys first.');
    }
    
    if (!params.cardElement) {
      console.error('Card element is missing');
      console.groupEnd();
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
      console.log('Intent type determined:', intentType, intentType === 'setup_intent' 
        ? '(Card will be stored for no-show protection)' 
        : '(Card will be charged immediately)');
      
      let result;
      
      // Process payment based on intent type
      if (intentType === 'setup_intent') {
        // No-show protection - just store the card
        console.log('📤 STRIPE CALL: confirmCardSetup (NO-SHOW PROTECTION)');
        console.log('Parameters:', {
          clientSecret: `${stripeKeys.clientSecret.substring(0, 15)}...`,
          payment_method: {
            card: 'Stripe Card Element',
            billing_details: params.billingDetails
          }
        });
        
        result = await stripe.confirmCardSetup(stripeKeys.clientSecret, {
          payment_method: {
            card: params.cardElement,
            billing_details: params.billingDetails
          }
        });
      } else {
        // Deposit - charge the card now
        console.log('📤 STRIPE CALL: confirmCardPayment (DEPOSIT PAYMENT)');
        console.log('Parameters:', {
          clientSecret: `${stripeKeys.clientSecret.substring(0, 15)}...`,
          payment_method: {
            card: 'Stripe Card Element',
            billing_details: params.billingDetails
          }
        });
        
        result = await stripe.confirmCardPayment(stripeKeys.clientSecret, {
          payment_method: {
            card: params.cardElement,
            billing_details: params.billingDetails
          }
        });
      }
      
      console.log('📥 Stripe confirmation result:', {
        hasError: !!result.error,
        setupIntent: result.setupIntent ? {
          id: result.setupIntent.id,
          status: result.setupIntent.status
        } : null,
        paymentIntent: result.paymentIntent ? {
          id: result.paymentIntent.id,
          status: result.paymentIntent.status
        } : null
      });
      
      if (result.error) {
        // Show error to your customer
        throw result.error;
      }
      
      // Payment or setup successful
      const pmId = intentType === 'setup_intent' 
        ? result.setupIntent.payment_method
        : result.paymentIntent.payment_method;
      
      console.log('✅ Payment method ID retrieved:', pmId.substring(0, 10) + '...');
      
      // Store the payment method ID
      setPaymentMethodId(pmId);
      
      console.timeEnd(label);
      console.groupEnd();
      return {
        success: true,
        paymentMethodId: pmId,
        intentType,
        status: intentType === 'setup_intent' ? result.setupIntent.status : result.paymentIntent.status
      };
    } catch (err) {
      console.error('❌ Payment processing failed:', err);
      setError(err.message || 'Payment processing failed');
      console.timeEnd(label);
      console.groupEnd();
      
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
    console.group('🔗 [useStripePayment] attachPaymentMethod');
    const label = `attachPaymentMethod-${params?.uid || 'n/a'}`;
    console.time(label);
    
    console.log('Attaching payment method with params:', {
      est: params.est,
      uid: params.uid,
      created: params.created,
      paymentMethodId: params.paymentMethodId ? params.paymentMethodId.substring(0, 10) + '...' : null,
      total: params.total,
      totalFormatted: `$${(params.total / 100).toFixed(2)}`
    });
    
    if (!params.paymentMethodId) {
      console.error('No payment method ID provided');
      console.groupEnd();
      throw new Error('No payment method available to attach');
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Validate booking exists first (optional but recommended)
      console.log('📤 API Call: restore (validating booking exists)');
      const restoreParams = {
        est: params.est,
        uid: params.uid,
        type: 0
      };
      console.log('Parameters:', restoreParams);
      
      await eveveApi.restore(restoreParams);
      
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
      
      console.log('📤 API Call: pm-id (attaching payment method)');
      console.log('Parameters:', {
        ...pmIdParams,
        pm: pmIdParams.pm.substring(0, 10) + '...',
        totalFormatted: `$${pmIdParams.totalFloat.toFixed(2)}`
      });
      
      const response = await eveveApi.pmId(pmIdParams);
      console.log('📥 API Response: pm-id', {
        ok: response.data.ok,
        code: response.data.code,
        total: response.data.total,
        currency: response.data.currency,
        message: response.data.message
      });
      
      if (!response.data.ok) {
        throw new Error('Failed to attach payment method to booking');
      }
      
      console.log('✅ Payment method successfully attached');
      setPaymentComplete(true);
      
      console.timeEnd(label);
      console.groupEnd();
      return {
        success: true,
        isDeposit: response.data.code === 2,
        isNoShow: response.data.code === 1,
        amount: response.data.total,
        currency: response.data.currency,
        message: response.data.message
      };
    } catch (err) {
      console.error('❌ Failed to attach payment method:', err);
      setError(err.message || 'Failed to attach payment method');
      console.timeEnd(label);
      console.groupEnd();
      
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
    console.group('🔄 [useStripePayment] completePaymentFlow');
    const label = `completePaymentFlow-${params?.uid || 'n/a'}`;
    console.time(label);
    
    console.log('Starting complete payment flow with params:', {
      est: params.est,
      uid: params.uid,
      created: params.created,
      firstName: params.firstName,
      lastName: params.lastName,
      email: params.email,
      cardElementExists: !!params.cardElement,
      hasPreCalculatedDeposit: !!params.preCalculatedDeposit
    });
    
    if (params.preCalculatedDeposit) {
      console.log('Pre-calculated deposit info provided:', {
        isDeposit: params.preCalculatedDeposit.isDeposit,
        isNoShow: params.preCalculatedDeposit.isNoShow,
        amount: params.preCalculatedDeposit.amount,
        amountFormatted: `$${(params.preCalculatedDeposit.amount / 100).toFixed(2)}`,
        currency: params.preCalculatedDeposit.currency,
        source: 'shift.charge=2 override (using calculated addon costs)'
      });
    }
    
    try {
      // Step 1: Fetch Stripe keys (only if not already fetched)
      let keys = stripeKeys;
      console.log('Step 1: Stripe Keys Status', keys ? 'Already fetched, reusing' : 'Not fetched, will fetch now');
      
      if (!keys) {
        console.log('Fetching Stripe keys...');
        keys = await fetchStripeKeys({
          est: params.est,
          uid: params.uid,
          created: params.created,
          desc: `${params.firstName}_${params.lastName}_-_${params.email}`,
          firstName: params.firstName,
          lastName: params.lastName,
          email: params.email
        });
        console.log('Stripe keys fetched successfully');
      }
      
      // Determine intent type for logging
      const intentType = stripeApi.getIntentType(keys.clientSecret);
      console.log('Stripe intent type:', intentType, 
        intentType === 'setup_intent' ? '(Card will be stored for no-show protection)' : '(Card will be charged immediately)');
      
      // Step 2: Deposit information
      let depositInfo;
      if (params.preCalculatedDeposit) {
        console.log('Step 2: Using pre-calculated deposit info (SKIPPING deposit-get API call)');
        depositInfo = params.preCalculatedDeposit;
        console.log('Deposit info (pre-calculated):', {
          isDeposit: depositInfo.isDeposit ? 'YES - Card will be charged now' : 'NO',
          isNoShow: depositInfo.isNoShow ? 'YES - Card stored for no-show protection' : 'NO',
          amount: depositInfo.amount,
          amountFormatted: `$${(depositInfo.amount / 100).toFixed(2)}`,
          currency: depositInfo.currency,
          source: 'shift.charge=2 override'
        });
      } else {
        console.log('Step 2: Fetching deposit info via deposit-get API call');
        depositInfo = await fetchDepositInfo({
          est: params.est,
          uid: params.uid,
          created: params.created
        });
        console.log('Deposit info (from API):', {
          isDeposit: depositInfo.isDeposit ? 'YES - Card will be charged now' : 'NO',
          isNoShow: depositInfo.isNoShow ? 'YES - Card stored for no-show protection' : 'NO',
          amount: depositInfo.amount,
          amountFormatted: `$${(depositInfo.amount / 100).toFixed(2)}`,
          currency: depositInfo.currency,
          source: 'Eveve API'
        });
      }
      
      // Log whether intent type matches deposit info
      if ((depositInfo.isDeposit && intentType === 'payment_intent') || 
          (depositInfo.isNoShow && intentType === 'setup_intent')) {
        console.log('✅ Intent type matches deposit info - correct flow will be used');
      } else {
        console.warn('⚠️ Intent type does not match deposit info - may cause issues');
      }
      
      // Step 3: Process payment
      console.log('Step 3: Processing payment with Stripe');
      console.log('Payment details:', {
        intentType: intentType,
        willChargeNow: depositInfo.isDeposit,
        amount: depositInfo.amount,
        amountFormatted: `$${(depositInfo.amount / 100).toFixed(2)}`,
        currency: depositInfo.currency
      });
      
      const paymentResult = await processPayment({
        cardElement: params.cardElement,
        billingDetails: {
          name: `${params.firstName} ${params.lastName}`,
          email: params.email
        }
      });
      
      if (!paymentResult.success) {
        console.error('❌ Payment processing failed:', paymentResult.error);
        console.timeEnd(label);
        console.groupEnd();
        return paymentResult;
      }
      
      // Step 4: Attach payment method
      console.log('Step 4: Attaching payment method to booking');
      console.log('Attachment details:', {
        paymentMethodId: paymentResult.paymentMethodId ? 
          `${paymentResult.paymentMethodId.substring(0, 8)}...` : null,
        amount: depositInfo.amount,
        amountFormatted: `$${(depositInfo.amount / 100).toFixed(2)}`,
        currency: depositInfo.currency
      });
      
      const attachResult = await attachPaymentMethod({
        est: params.est,
        uid: params.uid,
        created: params.created,
        paymentMethodId: paymentResult.paymentMethodId,
        total: depositInfo.amount
      });
      
      if (!attachResult.success) {
        console.error('❌ Payment method attachment failed:', attachResult.error);
        console.timeEnd(label);
        console.groupEnd();
        return attachResult;
      }
      
      console.log('✅ Payment flow completed successfully');
      console.log('Final payment details:', {
        paymentMethodId: paymentResult.paymentMethodId ? 
          `${paymentResult.paymentMethodId.substring(0, 8)}...` : null,
        isDeposit: depositInfo.isDeposit,
        isNoShow: depositInfo.isNoShow,
        amount: depositInfo.amount,
        amountFormatted: `$${(depositInfo.amount / 100).toFixed(2)}`,
        currency: depositInfo.currency,
        status: paymentResult.status,
        intentType: paymentResult.intentType
      });
      
      // Return comprehensive result
      const result = {
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
      
      console.timeEnd(label);
      console.groupEnd();
      return result;
    } catch (err) {
      console.error('❌ Payment flow failed:', err);
      setError(err.message || 'Payment flow failed');
      console.timeEnd(label);
      console.groupEnd();
      
      return {
        success: false,
        error: err.message,
        errorDetails: err.stack
      };
    }
  }, [fetchStripeKeys, fetchDepositInfo, processPayment, attachPaymentMethod]);

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
