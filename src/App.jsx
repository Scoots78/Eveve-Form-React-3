import React, { useEffect } from 'react';
import ReservationForm from './components/ReservationForm';
import { getTheme, applyTheme } from './utils/themeUtils';

function App() {
  useEffect(() => {
    // Ensure theme is properly applied when component mounts
    const theme = getTheme();
    applyTheme(theme);
  }, []);

  return (
    <div className="min-h-screen bg-base-200 p-0 sm:p-4 shadow-none flex items-start justify-center">
      <ReservationForm />
    </div>
  );
}

export default App;

