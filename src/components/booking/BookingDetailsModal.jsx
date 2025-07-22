import React, { useState, useEffect, useMemo } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { formatDecimalTime } from "../../utils/time";
import { formatCustomerDetails } from "../../utils/apiFormatter";
import { Elements, useStripe, useElements, CardElement } from "@stripe/react-stripe-js";
import StripeCardElement from "./StripeCardElement";
import StripeProvider from "./StripeProvider";
import { useStripePayment } from "../../hooks/booking/useStripePayment";

/**
 * CardForm - Inner component that uses Stripe hooks
 * This component must be rendered inside a Stripe Elements provider
 */
function CardForm({ onChange, disabled, label, showTestCards }) {
  const stripe = useStripe();
  const elements = useElements();
  
  // Log Stripe availability for debugging
  useEffect(() => {
    console.debug('[CardForm] Stripe availability:', !!stripe);
    console.debug('[CardForm] Elements availability:', !!elements);
  }, [stripe, elements]);
  
  const handleCardChange = (event) => {
    if (onChange) {
      // Pass the stripe and elements instances back to the parent
      onChange({
        complete: event.complete,
        error: event.error,
        empty: event.empty,
        brand: event.brand,
        stripe,
        elements
      });
    }
  };
  
  return (
    <StripeCardElement
      onChange={handleCardChange}
      disabled={disabled}
      showTestCards={showTestCards}
      label={label}
    />
  );
}

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
  const [cardComplete, setCardComplete] = useState(false);
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState(null);
  const [stripePublicKey, setStripePublicKey] = useState(null);
  const [stripeElements, setStripeElements] = useState(null);
  const [stripeInstance, setStripeInstance] = useState(null);
  const [cardElement, setCardElement] = useState(null);
  
  // Initialize stripe payment hook
  const {
    isLoading: isStripeLoading,
    error: stripeError,
    stripeKeys,
    depositInfo,
    fetchStripeKeys,
    fetchDepositInfo,
    processPayment,
    attachPaymentMethod,
    completePaymentFlow,
    reset: resetStripePayment
  } = useStripePayment();

  // Check if card is required
  const isCardRequired = holdData && holdData.card > 0;
  const isDepositRequired = holdData && holdData.card === 2;
  const isNoShowProtection = holdData && holdData.card === 1;

  // Reset form when modal opens with new hold data
  useEffect(() => {
    if (isOpen && holdData) {
      console.debug('[BookingDetailsModal] Modal opened with holdData:', {
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
      setCardComplete(false);
      setPaymentProcessing(false);
      setPaymentError(null);
      setStripeElements(null);
      setStripeInstance(null);
      setCardElement(null);
      resetStripePayment();
      
      // Fetch Stripe keys if card is required
      if (isCardRequired && holdData.uid && holdData.created) {
        console.debug('[BookingDetailsModal] Card is required, fetching Stripe keys');
        
        fetchStripeKeys({
          est: bookingData.est || holdData.est,
          uid: holdData.uid,
          created: holdData.created
        }).then(keys => {
          if (keys && keys.publicKey) {
            console.debug('[BookingDetailsModal] Stripe keys fetched successfully');
            setStripePublicKey(keys.publicKey);
            
            // Fetch deposit information
            return fetchDepositInfo({
              est: bookingData.est || holdData.est,
              uid: holdData.uid,
              created: holdData.created
            });
          }
        }).catch(err => {
          console.error("[BookingDetailsModal] Error initializing payment:", err);
          setPaymentError(err.message || "Failed to initialize payment system");
        });
      }
    }
  }, [isOpen, holdData, bookingData, fetchStripeKeys, fetchDepositInfo, resetStripePayment, isCardRequired]);

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
    console.debug('[BookingDetailsModal] Card element change:', {
      complete: event.complete,
      hasError: !!event.error,
      empty: event.empty,
      stripe: !!event.stripe,
      elements: !!event.elements
    });
    
    setCardComplete(event.complete);
    
    if (event.error) {
      setPaymentError(event.error.message);
    } else {
      setPaymentError(null);
    }
    
    // Store Stripe and Elements instances for later use
    if (event.stripe && event.elements) {
      setStripeInstance(event.stripe);
      setStripeElements(event.elements);
      
      // Get and store the CardElement for later use
      if (event.elements && !cardElement) {
        const element = event.elements.getElement(CardElement);
        if (element) {
          console.debug('[BookingDetailsModal] Card element retrieved and stored');
          setCardElement(element);
        }
      }
    }
  };

  // Validate the form
  const validateForm = () => {
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
    
    // Validate allergy details if allergy is selected
    if (customerData.allergy.has && !customerData.allergy.details.trim()) {
      errors["allergy.details"] = appConfig?.lng?.requiredFieldError || "This field is required";
    }
    
    // Validate card completion if card is required
    if (isCardRequired && !cardComplete) {
      errors.card = appConfig?.lng?.cardRequiredError || "Please complete your card details";
    }
    
    // Validate Stripe initialization if card is required
    if (isCardRequired && (!stripeInstance || !stripeElements || !cardElement)) {
      errors.stripe = "Payment system not properly initialized. Please refresh and try again.";
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate form
    const isValid = validateForm();
    
    if (isValid && holdData) {
      try {
        // Format customer data for API
        const formattedData = formatCustomerDetails(customerData);
        
        // If card is required, process payment first
        if (isCardRequired) {
          console.debug('[BookingDetailsModal] Processing payment for card-required booking');
          setPaymentProcessing(true);
          
          // Double-check that we have everything we need for Stripe
          if (!stripeInstance) {
            throw new Error("Stripe not initialized properly");
          }
          
          if (!stripeElements) {
            throw new Error("Stripe Elements not initialized properly");
          }
          
          if (!cardElement) {
            // Try to get the card element one more time
            const element = stripeElements.getElement(CardElement);
            if (!element) {
              throw new Error("Card element not found");
            }
            setCardElement(element);
          }
          
          console.debug('[BookingDetailsModal] Starting payment flow with:', {
            uid: holdData.uid,
            created: holdData.created,
            cardElementExists: !!cardElement
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
          
          console.debug('[BookingDetailsModal] Payment flow result:', {
            success: paymentResult.success,
            hasError: !!paymentResult.error,
            paymentMethodId: paymentResult.paymentMethodId ? 
              `${paymentResult.paymentMethodId.substring(0, 8)}...` : null
          });
          
          if (!paymentResult.success) {
            throw new Error(paymentResult.error || "Payment processing failed");
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
          
          console.debug('[BookingDetailsModal] Payment successful, updating booking with payment info');
          
          // Payment successful, now update booking
          onSubmit(holdData.uid, updatedCustomerData);
        } else {
          // No card required, just update booking
          console.debug('[BookingDetailsModal] No card required, updating booking directly');
          onSubmit(holdData.uid, customerData);
        }
      } catch (err) {
        console.error("[BookingDetailsModal] Error processing booking:", err);
        setPaymentError(err.message || "Failed to process payment");
        setPaymentProcessing(false);
      }
    }
  };

  // Create a memoized Stripe provider to prevent unnecessary re-renders
  const stripeProviderComponent = useMemo(() => {
    if (!stripePublicKey) return null;
    
    console.debug('[BookingDetailsModal] Creating Stripe provider with key:', 
      stripePublicKey ? `${stripePublicKey.substring(0, 8)}...` : 'none');
    
    return (
      <StripeProvider 
        stripeKey={stripePublicKey}
        onLoad={(stripe) => {
          console.debug('[BookingDetailsModal] Stripe loaded in provider');
          setStripeInstance(stripe);
        }}
        onError={(err) => {
          console.error('[BookingDetailsModal] Stripe provider error:', err);
          setPaymentError(`Payment system error: ${err.message || 'Unknown error'}`);
        }}
      >
        <CardForm
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
    if (!isCardRequired) return null;
    
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
        {paymentError && (
          <div className="mt-3 p-2 bg-red-50 text-red-700 text-sm rounded">
            <p className="font-medium">Payment Error:</p>
            <p>{paymentError}</p>
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
          if (!isLoading && !paymentProcessing) {
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
              {(isLoading || paymentProcessing) && (
                <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10">
                  <div className="flex flex-col items-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-purple-600"></div>
                    <p className="mt-4 text-purple-600 font-medium">
                      {paymentProcessing 
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

                    <form onSubmit={handleSubmit} className="mt-4">
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
                      
                      {/* Card Details Section - Only shown if card is required */}
                      {renderCardSection()}
                      
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
                          disabled={isLoading || paymentProcessing}
                        >
                          {appConfig?.lng?.bookingCloseButton || "Cancel"}
                        </button>
                        <button
                          type="submit"
                          className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
                          disabled={isLoading || paymentProcessing || (isCardRequired && !cardComplete)}
                        >
                          {isCardRequired 
                            ? (appConfig?.lng?.bookingConfirmWithPaymentButton || "Complete Payment & Book") 
                            : (appConfig?.lng?.bookingConfirmButton || "Confirm Booking")}
                        </button>
                      </div>
                    </form>
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
