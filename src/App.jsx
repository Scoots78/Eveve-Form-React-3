import React from 'react';
import ReservationForm from './components/ReservationForm';

function App() {
  return (
    <div className="min-h-screen bg-gray-100 p-4 flex items-start justify-center">
      <div className="w-full max-w-2xl bg-white shadow-lg rounded-lg p-6">
        <ReservationForm />
      </div>
    </div>
  );
}

export default App;

