import React, { useState, useEffect } from 'react';
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
  const [stripePromise, setStripePromise] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load Stripe when the component mounts or when the stripeKey changes
  useEffect(() => {
    if (!stripeKey) {
      setError('Stripe key is required');
      setLoading(false);
      if (onError) onError('Stripe key is required');
      return;
    }

    const initializeStripe = async () => {
      try {
        setLoading(true);
        const stripe = await loadStripe(stripeKey);
        setStripePromise(stripe);
        setLoading(false);
        if (onLoad) onLoad(stripe);
      } catch (err) {
        console.error('Error loading Stripe:', err);
        setError(err.message || 'Failed to load Stripe');
        setLoading(false);
        if (onError) onError(err);
      }
    };

    initializeStripe();
  }, [stripeKey, onLoad, onError]);

  // Default options for the Elements provider
  const defaultOptions = {
    fonts: [
      {
        cssSrc: 'https://fonts.googleapis.com/css?family=Roboto',
      },
    ],
  };

  // If still loading and no error, show loading state
  if (loading && !error) {
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
