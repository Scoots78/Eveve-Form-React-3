import React from 'react';
import ReservationForm from './components/ReservationForm';

function App() {
  return (
    <div className="min-h-screen bg-gray-100 p-0 sm:p-4 shadow-none flex items-start justify-center">
      <div className="w-full max-w-2xl bg-transparent sm:bg-white p-0 shadow-none sm:p-6 sm:shadow-lg rounded-lg">
        <ReservationForm />
      </div>
    </div>
  );
}

export default App;

