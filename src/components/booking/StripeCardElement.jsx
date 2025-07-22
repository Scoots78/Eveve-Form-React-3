import React, { useState, useEffect } from 'react';
import { CardElement } from '@stripe/react-stripe-js';

/**
 * StripeCardElement - A component that renders the Stripe Card Element
 * with proper styling and error handling
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
  const [error, setError] = useState(null);
  const [cardComplete, setCardComplete] = useState(false);

  // Default card element styling options
  const defaultOptions = {
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
  };

  // Merge default options with provided options
  const cardElementOptions = {
    ...defaultOptions,
    ...options
  };

  // Handle card element change
  const handleCardChange = (event) => {
    setError(event.error ? event.error.message : '');
    setCardComplete(event.complete);
    
    // Call parent onChange if provided
    if (onChange) {
      onChange({
        error: event.error,
        complete: event.complete,
        empty: event.empty
      });
    }
  };

  // Notify parent component when card completion status changes
  useEffect(() => {
    if (onChange) {
      onChange({
        error: error ? { message: error } : null,
        complete: cardComplete
      });
    }
  }, [cardComplete, error, onChange]);

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
          error ? 'border-red-500' : 'border-gray-300'
        } ${disabled ? 'bg-gray-100 opacity-50' : 'bg-white'}`}
      >
        <CardElement
          id="card-element"
          options={cardElementOptions}
          onChange={handleCardChange}
          disabled={disabled}
        />
      </div>
      
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
      
      {showTestCards && (
        <div className="text-xs text-gray-500 p-2 bg-gray-50 rounded mt-2">
          <p className="font-medium mb-1">Test Cards:</p>
          <p>Success: 4242 4242 4242 4242</p>
          <p>Decline: 4000 0000 0000 0002</p>
          <p>Use any future date, any 3 digits for CVC, and any postal code.</p>
        </div>
      )}
    </div>
  );
};

export default StripeCardElement;
