import React, { useState, useEffect } from 'react';
import { CardElement, useStripe, useElements } from '@stripe/react-stripe-js';

/**
 * StripeCardElement - A simplified component that renders the Stripe Card Element
 * 
 * @param {Object} props - Component props
 * @param {Function} props.onChange - Callback when card input changes
 * @param {boolean} props.disabled - Whether the card input is disabled
 * @param {Object} props.options - Options for the CardElement
 * @param {boolean} props.showTestCards - Whether to show test card information
 * @param {string} props.className - Additional CSS classes
 * @param {Object} props.labelProps - Props for the label element
 * @param {string} props.label - Label text for the card input
 */
const StripeCardElement = ({
  onChange,
  disabled = false,
  options = {},
  showTestCards = true,
  className = '',
  labelProps = {},
  label = 'Card Details'
}) => {
  // Track card state
  const [cardState, setCardState] = useState({
    error: null,
    complete: false,
    empty: true,
    brand: null
  });

  // Get Stripe instances - these are critical for payment processing
  const stripe = useStripe();
  const elements = useElements();

  // Default card element styling options
  const cardElementOptions = {
    style: {
      base: {
        fontSize: '16px',
        color: '#424770',
        fontFamily: 'Arial, sans-serif',
        '::placeholder': {
          color: '#aab7c4',
        },
      },
      invalid: {
        color: '#9e2146',
        iconColor: '#9e2146',
      },
    },
    hidePostalCode: true,
    ...options
  };

  // Notify parent when Stripe is ready or card state changes
  useEffect(() => {
    if (onChange && stripe && elements) {
      onChange({
        ...cardState,
        error: cardState.error ? { message: cardState.error } : null,
        stripe,
        elements
      });
    }
  }, [onChange, cardState, stripe, elements]);

  // Handle card element change
  const handleCardChange = (event) => {
    const updatedState = {
      error: event.error ? event.error.message : null,
      complete: event.complete,
      empty: event.empty,
      brand: event.brand || cardState.brand
    };
    
    setCardState(updatedState);
  };

  // Handle cases where Stripe isn't initialized
  if (!stripe || !elements) {
    return (
      <div className={`stripe-card-container ${className}`}>
        {label && (
          <label 
            htmlFor="card-element-placeholder" 
            className="block text-sm font-medium text-gray-700 mb-1"
            {...labelProps}
          >
            {label} <span className="text-red-500">*</span>
          </label>
        )}
        <div className="p-3 border border-gray-300 rounded-md bg-gray-100">
          <div className="h-6 flex items-center text-sm text-gray-500">
            Loading payment system...
          </div>
        </div>
        {showTestCards && renderTestCards()}
      </div>
    );
  }

  // Helper function to render test cards section
  function renderTestCards() {
    return (
      <div className="text-xs text-gray-500 p-2 bg-gray-50 rounded mt-2">
        <p className="font-medium mb-1">Test Cards:</p>
        <p>Success: 4242 4242 4242 4242</p>
        <p>Decline: 4000 0000 0000 0002</p>
        <p>Use any future date, any 3 digits for CVC, and any postal code.</p>
      </div>
    );
  }

  return (
    <div className={`stripe-card-container ${className}`}>
      {label && (
        <label 
          htmlFor="card-element" 
          className="block text-sm font-medium text-gray-700 mb-1"
          {...labelProps}
        >
          {label} <span className="text-red-500">*</span>
        </label>
      )}
      
      <div 
        className={`p-3 border rounded-md ${
          cardState.error ? 'border-red-500' : 'border-gray-300'
        } ${disabled ? 'bg-gray-100 opacity-50' : 'bg-white'}`}
      >
        <CardElement
          id="card-element"
          options={cardElementOptions}
          onChange={handleCardChange}
          disabled={disabled}
        />
      </div>
      
      {cardState.error && (
        <p className="mt-1 text-sm text-red-600">{cardState.error}</p>
      )}
      
      {cardState.brand && !cardState.error && !cardState.empty && (
        <p className="mt-1 text-xs text-gray-500">
          Card type: {cardState.brand.charAt(0).toUpperCase() + cardState.brand.slice(1)}
        </p>
      )}
      
      {showTestCards && renderTestCards()}
    </div>
  );
};

export default StripeCardElement;
