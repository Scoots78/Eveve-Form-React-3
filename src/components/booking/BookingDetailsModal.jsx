import React, { useState, useEffect, useMemo } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { formatDecimalTime } from "../../utils/time";
import { CardElement } from "@stripe/react-stripe-js";
import StripeCardElement from "./StripeCardElement";
import StripeProvider from "./StripeProvider";
import { useStripePayment } from "../../hooks/booking/useStripePayment";

/**
 * BookingDetailsModal - A modal dialog for collecting customer details and confirming the reservation
 * @param {Object} props - Component props
 * @param {boolean} props.isOpen - Whether the modal is open
 * @param {Function} props.onClose - Function to call when the modal is closed
 * @param {Object} props.holdData - Data from the successful hold request
 * @param {Object} props.bookingData - Original booking data (date, time, guests, etc.)
 * @param {Function} props.onSubmit - Function to call when the form is submitted
 * @param {Object} props.appConfig - App configuration object with language strings
 * @param {boolean} props.isLoading - Whether the form is submitting
 * @param {string} props.error - Error message if submission failed
 * @param {boolean} props.success - Whether submission was successful
 */
export default function BookingDetailsModal({
  isOpen,
  onClose,
  holdData,
  bookingData,
  onSubmit,
  appConfig,
  isLoading = false,
  error = null,
  success = false
}) {
  // Form step state
  const STEPS = {
    PERSONAL_DETAILS: 'personalDetails',
    PAYMENT: 'payment',
    COMPLETE: 'complete'
  };
  const [currentStep, setCurrentStep] = useState(STEPS.PERSONAL_DETAILS);
  
  // Customer details state
  const [customerData, setCustomerData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    notes: "",
    optin: true, // Pre-ticked by default
    allergy: {
      has: false,
      details: ""
    }
  });

  // Form validation state
  const [validationErrors, setValidationErrors] = useState({});
  const [formTouched, setFormTouched] = useState(false);
  
  // Stripe payment state
  const [cardState, setCardState] = useState({
    complete: false,
    error: null,
    empty: true,
    brand: null
  });
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [stripePublicKey, setStripePublicKey] = useState(null);
  const [isInitializingStripe, setIsInitializingStripe] = useState(false);
  
  // Initialize stripe payment hook
  const {
    isLoading: isStripeLoading,
    error: stripeError,
    stripeKeys,
    depositInfo,
    fetchStripeKeys,
    fetchDepositInfo,
    completePaymentFlow,
    reset: resetStripePayment
  } = useStripePayment();

  // Check if card is required
  const isCardRequired = holdData && holdData.card > 0;
  const isDepositRequired = holdData && holdData.card === 2;
  const isNoShowProtection = holdData && holdData.card === 1;

  // Helper for timestamp logs
  const logWithTimestamp = (message, data) => {
    console.log(`${new Date().toISOString()} [BookingDetailsModal] ${message}`, data || '');
  };

  // Reset form when modal opens with new hold data
  useEffect(() => {
    if (isOpen && holdData) {
      logWithTimestamp('Modal opened with holdData:', {
        uid: holdData.uid,
        card: holdData.card,
        perHead: holdData.perHead
      });
      
      // Reset form state
      setCustomerData({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        notes: "",
        optin: true,
        allergy: {
          has: false,
          details: ""
        }
      });
      setValidationErrors({});
      setFormTouched(false);
      setCardState({
        complete: false,
        error: null,
        empty: true,
        brand: null
      });
      setPaymentProcessing(false);
      setStripePublicKey(null);
      resetStripePayment();
      
      // Always start with personal details step
      setCurrentStep(STEPS.PERSONAL_DETAILS);
    }
  }, [isOpen, holdData, resetStripePayment, STEPS.PERSONAL_DETAILS]);

  // Handle input changes
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name === "allergy.has") {
      setCustomerData(prev => ({
        ...prev,
        allergy: {
          ...prev.allergy,
          has: checked
        }
      }));
    } else if (name === "allergy.details") {
      setCustomerData(prev => ({
        ...prev,
        allergy: {
          ...prev.allergy,
          details: value
        }
      }));
    } else if (type === "checkbox") {
      setCustomerData(prev => ({
        ...prev,
        [name]: checked
      }));
    } else {
      setCustomerData(prev => ({
        ...prev,
        [name]: value
      }));
    }
    
    // Mark form as touched once user starts interacting
    if (!formTouched) {
      setFormTouched(true);
    }
  };
  
  // Handle card element change
  const handleCardChange = (event) => {
    logWithTimestamp('Card element change:', {
      complete: event.complete,
      hasError: !!event.error,
      empty: event.empty,
      stripe: !!event.stripe,
      elements: !!event.elements
    });
    
    setCardState({
      complete: event.complete,
      error: event.error ? event.error.message : null,
      empty: event.empty,
      brand: event.brand,
      stripe: event.stripe,
      elements: event.elements
    });
  };

  // Validate just the personal details section
  const validatePersonalDetails = () => {
    const errors = {};
    
    if (!customerData.firstName.trim()) {
      errors.firstName = appConfig?.lng?.requiredFieldError || "This field is required";
    }
    
    if (!customerData.lastName.trim()) {
      errors.lastName = appConfig?.lng?.requiredFieldError || "This field is required";
    }
    
    if (!customerData.email.trim()) {
      errors.email = appConfig?.lng?.requiredFieldError || "This field is required";
    } else if (!/\S+@\S+\.\S+/.test(customerData.email)) {
      errors.email = appConfig?.lng?.emailFormatError || "Please enter a valid email address";
    }
    
    if (!customerData.phone.trim()) {
      errors.phone = appConfig?.lng?.requiredFieldError || "This field is required";
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Validate the full form
  const validateForm = () => {
    const errors = {};
    
    // Include personal details validation
    if (!validatePersonalDetails()) {
      return false;
    }
    
    // Validate allergy details if allergy is selected
    if (customerData.allergy.has && !customerData.allergy.details.trim()) {
      errors["allergy.details"] = appConfig?.lng?.requiredFieldError || "This field is required";
    }
    
    // Validate card completion if card is required
    if (isCardRequired && !cardState.complete) {
      errors.card = appConfig?.lng?.cardRequiredError || "Please complete your card details";
    }
    
    // Validate Stripe initialization if card is required
    if (isCardRequired && (!cardState.stripe || !cardState.elements)) {
      errors.stripe = "Payment system not properly initialized. Please refresh and try again.";
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Initialize Stripe with customer details
  const initializeStripe = async () => {
    if (!isCardRequired || !holdData || !holdData.uid || !holdData.created) {
      return;
    }
    
    const timerLabel = `[BookingDetailsModal] initializeStripe-${holdData.uid}`;
    console.time(timerLabel);
    
    try {
      setIsInitializingStripe(true);
      
      logWithTimestamp('Initializing Stripe with customer details:', {
        firstName: customerData.firstName,
        lastName: customerData.lastName,
        email: customerData.email,
        uid: holdData.uid
      });
      
      // Fetch Stripe keys with customer details
      const keys = await fetchStripeKeys({
        est: bookingData.est || holdData.est,
        uid: holdData.uid,
        created: holdData.created,
        desc: `${customerData.firstName}_${customerData.lastName}_-_${customerData.email}`,
        firstName: customerData.firstName,
        lastName: customerData.lastName,
        email: customerData.email
      });
      
      if (keys && keys.publicKey) {
        logWithTimestamp('Stripe keys fetched successfully', {
          publicKey: keys.publicKey.substring(0, 8) + '...',
          hasClientSecret: !!keys.clientSecret
        });
        setStripePublicKey(keys.publicKey);
        
        // Fetch deposit information
        logWithTimestamp('Fetching deposit information');
        const depositData = await fetchDepositInfo({
          est: bookingData.est || holdData.est,
          uid: holdData.uid,
          created: holdData.created
        });
        
        logWithTimestamp('Deposit info received', {
          isDeposit: depositData.isDeposit,
          isNoShow: depositData.isNoShow,
          amount: depositData.amount
        });
        
        // Move to payment step
        setCurrentStep(STEPS.PAYMENT);
      } else {
        throw new Error("Failed to retrieve Stripe keys");
      }
    } catch (err) {
      console.error(`${new Date().toISOString()} [BookingDetailsModal] Error initializing payment:`, err);
      setCardState(prev => ({
        ...prev,
        error: err.message || "Failed to initialize payment system"
      }));
    } finally {
      setIsInitializingStripe(false);
      console.timeEnd(timerLabel);
    }
  };

  // Handle "Continue to Payment" button click
  const handleContinueToPayment = async (e) => {
    e.preventDefault();
    logWithTimestamp('Continue to payment button clicked');
    
    // Validate personal details
    if (validatePersonalDetails()) {
      await initializeStripe();
    } else {
      logWithTimestamp('Personal details validation failed', validationErrors);
    }
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Create a unique timer label for this submission
    const submissionId = Date.now().toString(36);
    const timerLabel = `[BookingDetailsModal] handleSubmit-${submissionId}`;
    console.time(timerLabel);
    
    logWithTimestamp(`Form submission started (${submissionId})`, {
      isCardRequired,
      currentStep: currentStep,
      bookingUid: holdData?.uid
    });
    
    // For non-card bookings, validate and submit directly
    if (!isCardRequired) {
      if (validateForm()) {
        try {
          logWithTimestamp('Submitting non-card booking');
          onSubmit(holdData.uid, customerData);
        } catch (err) {
          console.error(`${new Date().toISOString()} [BookingDetailsModal] Error processing booking:`, err);
        }
      } else {
        logWithTimestamp('Non-card booking validation failed', validationErrors);
      }
      console.timeEnd(timerLabel);
      return;
    }
    
    // For card bookings, process payment first
    if (validateForm()) {
      try {
        logWithTimestamp('Processing payment for card-required booking', {
          step: 'start',
          uid: holdData.uid,
          cardComplete: cardState.complete,
          hasStripe: !!cardState.stripe,
          hasElements: !!cardState.elements
        });
        
        setPaymentProcessing(true);
        
        // Double-check that we have everything we need for Stripe
        if (!cardState.stripe) {
          const error = new Error("Stripe not initialized properly");
          logWithTimestamp('Payment error: Stripe not initialized', { error });
          throw error;
        }
        
        if (!cardState.elements) {
          const error = new Error("Stripe Elements not initialized properly");
          logWithTimestamp('Payment error: Elements not initialized', { error });
          throw error;
        }
        
        // Get the card element
        const cardElement = cardState.elements.getElement(CardElement);
        if (!cardElement) {
          const error = new Error("Card element not found");
          logWithTimestamp('Payment error: Card element not found', { error });
          throw error;
        }
        
        logWithTimestamp('Starting payment flow', {
          uid: holdData.uid,
          created: holdData.created,
          cardElementExists: !!cardElement,
          step: 'before-completePaymentFlow'
        });
        
        // Process payment flow
        const paymentResult = await completePaymentFlow({
          est: bookingData.est || holdData.est,
          uid: holdData.uid,
          created: holdData.created,
          firstName: customerData.firstName,
          lastName: customerData.lastName,
          email: customerData.email,
          cardElement: cardElement
        });
        
        logWithTimestamp('Payment flow result', {
          success: paymentResult.success,
          hasError: !!paymentResult.error,
          errorMessage: paymentResult.error,
          paymentMethodId: paymentResult.paymentMethodId ? 
            `${paymentResult.paymentMethodId.substring(0, 8)}...` : null,
          intentType: paymentResult.intentType,
          status: paymentResult.status,
          step: 'after-completePaymentFlow'
        });
        
        if (!paymentResult.success) {
          const error = new Error(paymentResult.error || "Payment processing failed");
          logWithTimestamp('Payment flow failed', { 
            error: error.message,
            details: paymentResult.errorDetails
          });
          throw error;
        }
        
        // Add payment information to customer data for the booking update
        const updatedCustomerData = {
          ...customerData,
          paymentMethodId: paymentResult.paymentMethodId,
          paymentAmount: paymentResult.amount,
          paymentCurrency: paymentResult.currency,
          isDeposit: paymentResult.isDeposit,
          isNoShow: paymentResult.isNoShow
        };
        
        logWithTimestamp('Payment successful, updating booking with payment info', {
          paymentMethodId: paymentResult.paymentMethodId ? 
            `${paymentResult.paymentMethodId.substring(0, 8)}...` : null,
          amount: paymentResult.amount,
          isDeposit: paymentResult.isDeposit,
          step: 'before-onSubmit'
        });
        
        // Payment successful, now update booking
        onSubmit(holdData.uid, updatedCustomerData);
        
        logWithTimestamp('Booking update submitted', {
          step: 'after-onSubmit'
        });
        
        // Set to complete step
        setCurrentStep(STEPS.COMPLETE);
      } catch (err) {
        console.error(`${new Date().toISOString()} [BookingDetailsModal] Error processing booking:`, {
          message: err.message,
          stack: err.stack,
          name: err.name,
          code: err.code,
          type: err.type,
          decline_code: err.decline_code,
          param: err.param
        });
        
        setCardState(prev => ({
          ...prev,
          error: err.message || "Failed to process payment"
        }));
        setPaymentProcessing(false);
      } finally {
        console.timeEnd(timerLabel);
      }
    } else {
      logWithTimestamp('Card booking validation failed', validationErrors);
      console.timeEnd(timerLabel);
    }
  };

  // Create a memoized Stripe provider to prevent unnecessary re-renders
  const stripeProviderComponent = useMemo(() => {
    if (!stripePublicKey) return null;
    
    logWithTimestamp('Creating Stripe provider with key:', 
      stripePublicKey ? `${stripePublicKey.substring(0, 8)}...` : 'none');
    
    return (
      <StripeProvider 
        stripeKey={stripePublicKey}
        onLoad={(stripe) => {
          logWithTimestamp('Stripe loaded in provider', {
            stripeInstanceExists: !!stripe
          });
        }}
        onError={(err) => {
          console.error(`${new Date().toISOString()} [BookingDetailsModal] Stripe provider error:`, {
            message: err.message,
            stack: err.stack,
            name: err.name
          });
          
          setCardState(prev => ({
            ...prev,
            error: `Payment system error: ${err.message || 'Unknown error'}`
          }));
        }}
      >
        <StripeCardElement
          onChange={handleCardChange}
          disabled={paymentProcessing}
          showTestCards={true}
          label={appConfig?.lng?.cardDetailsLabel || "Card Details"}
        />
      </StripeProvider>
    );
  }, [stripePublicKey, paymentProcessing, appConfig]);

  // Render content based on card requirement
  const renderCardSection = () => {
    if (!isCardRequired || currentStep !== STEPS.PAYMENT) return null;
    
    return (
      <div className="mb-6">
        <h4 className="font-medium text-gray-700 mb-2">
          {isDepositRequired 
            ? (appConfig?.lng?.depositTitle || "Deposit Payment") 
            : (appConfig?.lng?.cardDetailsTitle || "Card Details for No-Show Protection")}
        </h4>
        
        {/* Payment type info */}
        <div className="mb-4 p-3 bg-blue-50 rounded-md">
          <p className="text-sm text-blue-800">
            {isDepositRequired ? (
              <>
                <span className="font-semibold">Deposit Required:</span> ${(holdData.perHead * bookingData.covers / 100).toFixed(2)}
                <span className="block mt-1 text-xs">Your card will be charged immediately.</span>
              </>
            ) : (
              <>
                <span className="font-semibold">No-Show Protection:</span> ${(holdData.perHead * bookingData.covers / 100).toFixed(2)}
                <span className="block mt-1 text-xs">Your card will only be charged in case of a no-show.</span>
              </>
            )}
          </p>
        </div>
        
        {/* Stripe Card Element */}
        {stripePublicKey ? (
          stripeProviderComponent
        ) : (
          <div className="p-3 bg-gray-100 rounded border border-gray-200 text-gray-500 text-sm">
            {isStripeLoading ? "Loading payment form..." : "Payment system unavailable"}
          </div>
        )}
        
        {/* Payment error */}
        {cardState.error && (
          <div className="mt-3 p-2 bg-red-50 text-red-700 text-sm rounded">
            <p className="font-medium">Payment Error:</p>
            <p>{cardState.error}</p>
          </div>
        )}
        
        {/* Validation error */}
        {validationErrors.stripe && (
          <div className="mt-3 p-2 bg-red-50 text-red-700 text-sm rounded">
            <p>{validationErrors.stripe}</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <Transition show={isOpen} as={React.Fragment}>
      <Dialog
        as="div"
        className="fixed inset-0 z-10 overflow-y-auto"
        onClose={() => {
          // Only allow closing if not in loading state
          if (!isLoading && !paymentProcessing && !isInitializingStripe) {
            onClose();
          }
        }}
      >
        <div className="min-h-screen px-4 text-center">
          <Transition.Child
            as={React.Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <Dialog.Overlay className="fixed inset-0 bg-black opacity-30" />
          </Transition.Child>

          {/* This element is to trick the browser into centering the modal contents. */}
          <span
            className="inline-block h-screen align-middle"
            aria-hidden="true"
          >
            &#8203;
          </span>

          <Transition.Child
            as={React.Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0 scale-95"
            enterTo="opacity-100 scale-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-95"
          >
            <div className="inline-block w-full max-w-2xl p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-2xl">
              {/* Loading overlay */}
              {(isLoading || paymentProcessing || isInitializingStripe) && (
                <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10">
                  <div className="flex flex-col items-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-purple-600"></div>
                    <p className="mt-4 text-purple-600 font-medium">
                      {isInitializingStripe
                        ? "Initializing payment system..."
                        : paymentProcessing 
                          ? (appConfig?.lng?.paymentProcessingMessage || "Processing payment...") 
                          : (appConfig?.lng?.bookingLoadingMessage || "Confirming your reservation...")}
                    </p>
                  </div>
                </div>
              )}

              {/* Success message */}
              {success ? (
                <div className="text-center py-8">
                  <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
                    <svg
                      className="h-8 w-8 text-green-600"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M5 13l4 4L19 7"
                      ></path>
                    </svg>
                  </div>
                  <h3 className="mt-4 text-lg font-medium text-gray-900">
                    {appConfig?.lng?.bookingSuccessTitle || "Booking Confirmed!"}
                  </h3>
                  <p className="mt-2 text-gray-600">
                    {appConfig?.lng?.bookingSuccessMessage || "Your reservation has been confirmed. We look forward to seeing you!"}
                  </p>
                  <div className="mt-6">
                    <button
                      type="button"
                      className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                      onClick={onClose}
                    >
                      {appConfig?.lng?.bookingCloseButton || "Close"}
                    </button>
                  </div>
                </div>
              ) : (
                /* Error message or form */
                error ? (
                  <div className="text-center py-8">
                    <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                      <svg
                        className="h-8 w-8 text-red-600"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M6 18L18 6M6 6l12 12"
                        ></path>
                      </svg>
                    </div>
                    <h3 className="mt-4 text-lg font-medium text-gray-900">
                      {appConfig?.lng?.bookingErrorTitle || "Booking Error"}
                    </h3>
                    <p className="mt-2 text-red-600">
                      {error}
                    </p>
                    <p className="mt-2 text-gray-600">
                      {appConfig?.lng?.bookingErrorMessage || "There was a problem confirming your booking. Please try again or contact us directly."}
                    </p>
                    <div className="mt-6">
                      <button
                        type="button"
                        className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                        onClick={onClose}
                      >
                        {appConfig?.lng?.bookingCloseButton || "Close"}
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Main form */
                  <>
                    <Dialog.Title
                      as="h3"
                      className="text-lg font-medium leading-6 text-gray-900 text-center"
                    >
                      {appConfig?.lng?.bookingDetailsTitle || "Complete Your Reservation"}
                    </Dialog.Title>

                    {/* Booking summary */}
                    {bookingData && (
                      <div className="mt-4 bg-gray-50 p-4 rounded-lg">
                        <h4 className="font-medium text-gray-700">
                          {appConfig?.lng?.bookingSummaryTitle || "Booking Summary"}
                        </h4>
                        <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <span className="font-medium">{appConfig?.lng?.date || "Date"}:</span> {bookingData.formattedDate}
                          </div>
                          <div>
                            <span className="font-medium">{appConfig?.lng?.time || "Time"}:</span> {formatDecimalTime(bookingData.time, appConfig?.timeFormat)}
                          </div>
                          <div>
                            <span className="font-medium">{appConfig?.lng?.pax || "Guests"}:</span> {bookingData.covers}
                          </div>
                          {bookingData.areaName && (
                            <div>
                              <span className="font-medium">Area:</span> {bookingData.areaName}
                            </div>
                          )}
                        </div>
                        {/* Display selected addons if any */}
                        {bookingData.formattedAddons && (
                          <div className="mt-2 text-sm">
                            <div className="font-medium">{appConfig?.lng?.addons || "Add-ons"}:</div>
                            <div className="pl-2">{bookingData.formattedAddons}</div>
                          </div>
                        )}
                        {/* Display price if available in hold data */}
                        {holdData && holdData.perHead && (
                          <div className="mt-2 text-sm font-bold">
                            <span>{appConfig?.lng?.bookingTotalPrice || "Total Price"}:</span> ${(holdData.perHead * bookingData.covers / 100).toFixed(2)}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Step indicator */}
                    {isCardRequired && (
                      <div className="mt-4 mb-2">
                        <div className="flex items-center justify-center">
                          <div className={`flex items-center ${currentStep === STEPS.PERSONAL_DETAILS ? 'text-purple-600 font-medium' : 'text-gray-500'}`}>
                            <span className={`flex items-center justify-center w-6 h-6 rounded-full mr-2 ${currentStep === STEPS.PERSONAL_DETAILS ? 'bg-purple-100 text-purple-600' : 'bg-gray-200 text-gray-600'}`}>1</span>
                            <span>Personal Details</span>
                          </div>
                          <div className="w-8 h-0.5 mx-2 bg-gray-300"></div>
                          <div className={`flex items-center ${currentStep === STEPS.PAYMENT ? 'text-purple-600 font-medium' : 'text-gray-500'}`}>
                            <span className={`flex items-center justify-center w-6 h-6 rounded-full mr-2 ${currentStep === STEPS.PAYMENT ? 'bg-purple-100 text-purple-600' : 'bg-gray-200 text-gray-600'}`}>2</span>
                            <span>Payment</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Personal details form */}
                    {currentStep === STEPS.PERSONAL_DETAILS && (
                      <form onSubmit={handleContinueToPayment} className="mt-4">
                        {/* Personal details section */}
                        <div className="mb-6">
                          <h4 className="font-medium text-gray-700 mb-2">
                            {appConfig?.lng?.bookingPersonalDetailsTitle || "Your Details"}
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {/* First Name */}
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                {appConfig?.lng?.firstName || "First Name"} *
                              </label>
                              <input
                                type="text"
                                name="firstName"
                                value={customerData.firstName}
                                onChange={handleInputChange}
                                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 ${
                                  validationErrors.firstName ? "border-red-500" : "border-gray-300"
                                }`}
                              />
                              {validationErrors.firstName && (
                                <p className="mt-1 text-sm text-red-600">{validationErrors.firstName}</p>
                              )}
                            </div>
                            
                            {/* Last Name */}
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                {appConfig?.lng?.lastName || "Last Name"} *
                              </label>
                              <input
                                type="text"
                                name="lastName"
                                value={customerData.lastName}
                                onChange={handleInputChange}
                                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 ${
                                  validationErrors.lastName ? "border-red-500" : "border-gray-300"
                                }`}
                              />
                              {validationErrors.lastName && (
                                <p className="mt-1 text-sm text-red-600">{validationErrors.lastName}</p>
                              )}
                            </div>
                            
                            {/* Email */}
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                {appConfig?.lng?.email || "Email"} *
                              </label>
                              <input
                                type="email"
                                name="email"
                                value={customerData.email}
                                onChange={handleInputChange}
                                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 ${
                                  validationErrors.email ? "border-red-500" : "border-gray-300"
                                }`}
                              />
                              {validationErrors.email && (
                                <p className="mt-1 text-sm text-red-600">{validationErrors.email}</p>
                              )}
                            </div>
                            
                            {/* Phone */}
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                {appConfig?.lng?.phone || "Phone"} *
                              </label>
                              <input
                                type="tel"
                                name="phone"
                                value={customerData.phone}
                                onChange={handleInputChange}
                                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 ${
                                  validationErrors.phone ? "border-red-500" : "border-gray-300"
                                }`}
                              />
                              {validationErrors.phone && (
                                <p className="mt-1 text-sm text-red-600">{validationErrors.phone}</p>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        {/* Allergies section */}
                        <div className="mb-6">
                          <h4 className="font-medium text-gray-700 mb-2">
                            {appConfig?.lng?.bookingAllergiesTitle || "Allergies & Dietary Requirements"}
                          </h4>
                          <div className="space-y-2">
                            <div className="flex items-center">
                              <input
                                id="allergies-yes"
                                type="radio"
                                name="allergy.has"
                                checked={customerData.allergy.has}
                                onChange={() => {
                                  setCustomerData(prev => ({
                                    ...prev,
                                    allergy: {
                                      ...prev.allergy,
                                      has: true
                                    }
                                  }));
                                  if (!formTouched) setFormTouched(true);
                                }}
                                className="h-4 w-4 text-purple-600 focus:ring-purple-500"
                              />
                              <label htmlFor="allergies-yes" className="ml-2 block text-sm text-gray-700">
                                {appConfig?.lng?.allergiesYes || "Yes, I have dietary requirements"}
                              </label>
                            </div>
                            <div className="flex items-center">
                              <input
                                id="allergies-no"
                                type="radio"
                                name="allergy.has"
                                checked={!customerData.allergy.has}
                                onChange={() => {
                                  setCustomerData(prev => ({
                                    ...prev,
                                    allergy: {
                                      ...prev.allergy,
                                      has: false,
                                      details: ""
                                    }
                                  }));
                                  if (!formTouched) setFormTouched(true);
                                }}
                                className="h-4 w-4 text-purple-600 focus:ring-purple-500"
                              />
                              <label htmlFor="allergies-no" className="ml-2 block text-sm text-gray-700">
                                {appConfig?.lng?.allergiesNo || "No dietary requirements"}
                              </label>
                            </div>
                            
                            {customerData.allergy.has && (
                              <div className="mt-2">
                                <textarea
                                  name="allergy.details"
                                  value={customerData.allergy.details}
                                  onChange={handleInputChange}
                                  rows="3"
                                  placeholder={appConfig?.lng?.allergiesDetails || "Please describe your dietary requirements"}
                                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 ${
                                    validationErrors["allergy.details"] ? "border-red-500" : "border-gray-300"
                                  }`}
                                ></textarea>
                                {validationErrors["allergy.details"] && (
                                  <p className="mt-1 text-sm text-red-600">{validationErrors["allergy.details"]}</p>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {/* Notes section */}
                        <div className="mb-6">
                          <h4 className="font-medium text-gray-700 mb-2">
                            {appConfig?.lng?.bookingNotesTitle || "Special Requests"}
                          </h4>
                          <textarea
                            name="notes"
                            value={customerData.notes}
                            onChange={handleInputChange}
                            rows="3"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500"
                          ></textarea>
                          <p className="mt-1 text-xs text-gray-500">
                            Special requests are not guaranteed and are subject to availability.
                          </p>
                        </div>
                        
                        {/* Opt-in for marketing */}
                        <div className="mb-6">
                          <div className="flex items-center">
                            <input
                              id="optin"
                              type="checkbox"
                              name="optin"
                              checked={customerData.optin}
                              onChange={handleInputChange}
                              className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                            />
                            <label htmlFor="optin" className="ml-2 block text-sm text-gray-700">
                              {appConfig?.lng?.optinLabel || "Keep me informed about news and offers"}
                            </label>
                          </div>
                        </div>
                        
                        {/* Form buttons */}
                        <div className="mt-6 flex justify-between">
                          <button
                            type="button"
                            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                            onClick={onClose}
                            disabled={isLoading || isInitializingStripe}
                          >
                            {appConfig?.lng?.bookingCloseButton || "Cancel"}
                          </button>
                          
                          {isCardRequired ? (
                            <button
                              type="submit"
                              className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
                              disabled={isLoading || isInitializingStripe}
                            >
                              {appConfig?.lng?.continueToPaymentButton || "Continue to Payment"}
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={handleSubmit}
                              className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
                              disabled={isLoading}
                            >
                              {appConfig?.lng?.bookingConfirmButton || "Confirm Booking"}
                            </button>
                          )}
                        </div>
                      </form>
                    )}

                    {/* Payment form */}
                    {currentStep === STEPS.PAYMENT && (
                      <form onSubmit={handleSubmit} className="mt-4">
                        {/* Card Details Section */}
                        {renderCardSection()}
                        
                        {/* Form buttons */}
                        <div className="mt-6 flex justify-between">
                          <button
                            type="button"
                            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                            onClick={() => {
                              logWithTimestamp('Back button clicked, returning to personal details');
                              setCurrentStep(STEPS.PERSONAL_DETAILS);
                            }}
                            disabled={isLoading || paymentProcessing}
                          >
                            {appConfig?.lng?.backButton || "Back"}
                          </button>
                          <button
                            type="submit"
                            className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={isLoading || paymentProcessing || !cardState.complete}
                            onClick={() => {
                              logWithTimestamp('Payment submit button clicked', {
                                cardComplete: cardState.complete,
                                hasStripe: !!cardState.stripe,
                                hasElements: !!cardState.elements
                              });
                            }}
                          >
                            {appConfig?.lng?.bookingConfirmWithPaymentButton || "Complete Payment & Book"}
                          </button>
                        </div>
                      </form>
                    )}
                  </>
                )
              )}
            </div>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition>
  );
}
