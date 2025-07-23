import React, { useState, useMemo } from 'react';
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

  /* ------------------------------------------------------------------ *
   * Global  Promise  Cache                                             *
   * ------------------------------------------------------------------ */
  // Share Stripe instance across the entire bundle to avoid
  // “Please use the same instance of Stripe…” errors.
  // Keyed by publishable key so multiple keys can coexist in theory.
  const stripePromiseCache = globalThis.__EVEVE_STRIPE_PROMISES__ ||
    (globalThis.__EVEVE_STRIPE_PROMISES__ = {});

  const getStripePromise = (pk) => {
    if (!pk) return null;
    if (!stripePromiseCache[pk]) {
      console.debug('[StripeProvider] Loading Stripe.js for', pk.slice(0, 8) + '…');
      stripePromiseCache[pk] = loadStripe(pk)
        .then((stripe) => {
          console.debug('[StripeProvider] Stripe instance ready');
          return stripe;
        })
        .catch((err) => {
          console.error('[StripeProvider] Failed to load Stripe.js', err);
          throw err;
        });
    }
    return stripePromiseCache[pk];
  };

  // Memo to avoid recalculating promise while key unchanged in this render
  const stripePromise = useMemo(() => {
    if (!stripeKey) {
      setError('Stripe key is required');
      if (onError) onError('Stripe key is required');
      return null;
    }
    const promise = getStripePromise(stripeKey);
    promise
      .then((stripe) => onLoad && onLoad(stripe))
      .catch((err) => {
        setError(err.message || 'Failed to load Stripe');
        onError && onError(err);
      });
    return promise;
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
