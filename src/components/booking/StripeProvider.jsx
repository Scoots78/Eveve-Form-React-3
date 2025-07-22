import React, { useState, useEffect, useMemo } from 'react';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';

/**
 * StripeProvider - A component that provides the Stripe context to the application
 * 
 * @param {Object} props - Component props
 * @param {string} props.stripeKey - Stripe publishable API key
 * @param {React.ReactNode} props.children - Child components
 * @param {Object} props.options - Additional options for the Stripe Elements provider
 * @param {Function} props.onLoad - Callback when Stripe is loaded
 * @param {Function} props.onError - Callback when Stripe fails to load
 */
const StripeProvider = ({ 
  stripeKey, 
  children, 
  options = {}, 
  onLoad,
  onError
}) => {
  const [error, setError] = useState(null);

  /**
   * Memo-ise the promise returned by `loadStripe`.  
   * This guarantees the same Stripe instance is reused for the same key,
   * preventing “Please use the same instance of Stripe…” errors.
   */
  const stripePromise = useMemo(() => {
    if (!stripeKey) {
      setError('Stripe key is required');
      if (onError) onError('Stripe key is required');
      return null;
    }

    console.debug('[StripeProvider] Initialising Stripe for key:', stripeKey.slice(0, 8) + '…');

    const promise = loadStripe(stripeKey);

    promise
      .then((stripe) => {
        console.debug('[StripeProvider] Stripe loaded');
        if (onLoad) onLoad(stripe);
      })
      .catch((err) => {
        console.error('[StripeProvider] Error loading Stripe:', err);
        setError(err.message || 'Failed to load Stripe');
        if (onError) onError(err);
      });

    return promise;
    // Re-run only when publishable key changes
  }, [stripeKey]);

  // Default options for the Elements provider
  const defaultOptions = {
    fonts: [
      {
        cssSrc: 'https://fonts.googleapis.com/css?family=Roboto',
      },
    ],
  };

  // If promise still pending and no error, show loading state
  if (!error && !stripePromise) {
    return <div className="stripe-loading">Loading payment system...</div>;
  }

  // If there's an error, show error state
  if (error) {
    return <div className="stripe-error">Error: {error}</div>;
  }

  // If Stripe is loaded, render the Elements provider with children
  return (
    <Elements stripe={stripePromise} options={{ ...defaultOptions, ...options }}>
      {children}
    </Elements>
  );
};

export default StripeProvider;
