import React, { useState, useEffect, useCallback } from "react";
import GuestSelector from "./guestSelector";
import CalendarPicker from "./CalendarPicker";
import { format } from 'date-fns';

// Helper function to format decimal time (e.g., 12.00, 14.5) to AM/PM string
const formatDecimalTime = (decimalTime) => {
  if (typeof decimalTime !== 'number') return '';
  let hours = Math.floor(decimalTime);
  const minutes = Math.round((decimalTime - hours) * 60);
  const ampm = hours >= 12 && hours < 24 ? 'PM' : 'AM'; // Handle 24h case for midnight AM

  if (hours === 0) { // Midnight case
    hours = 12;
  } else if (hours > 12 && hours < 24) { // PM times
    hours -= 12;
  }
  // hours remains as is for AM times e.g. 10.00 is 10 AM

  const formattedMinutes = minutes < 10 ? `0${minutes}` : minutes;
  return `${hours}:${formattedMinutes} ${ampm}`;
};


export default function ReservationForm() {
  const urlParams = new URLSearchParams(window.location.search);
  const est = urlParams.get("est") || "testnza"; // fallback

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [guests, setGuests] = useState(''); // Initial state: empty string for placeholder

  const [availabilityData, setAvailabilityData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState(null);

  const handleDateChange = (dates) => {
    if (dates && dates.length > 0) {
      setSelectedDate(dates[0]);
      // Clear previous results and errors when date changes, useEffect will trigger new fetch
      setAvailabilityData(null);
      setApiError(null);
    }
  };

  const handleGuestsChange = (newGuestValue) => {
    setGuests(newGuestValue);
    // Clear previous results and errors when guests change, useEffect will trigger new fetch or clear
    setAvailabilityData(null);
    setApiError(null);
  };

  // Debounce utility
  const debounce = (func, delay) => {
    let timeoutId;
    const debouncedFunc = (...args) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        func.apply(this, args);
      }, delay);
    };
    debouncedFunc.clear = () => { // Add a method to clear the timeout
      clearTimeout(timeoutId);
    };
    return debouncedFunc;
  };

  const fetchAvailability = useCallback(async (date, numGuests) => {
    if (!date || typeof numGuests !== 'number' || numGuests < 1) {
      setAvailabilityData(null);
      setApiError(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setApiError(null);
    const formattedDate = format(date, 'yyyy-MM-dd');
    const apiUrl = `https://nz6.eveve.com/web/day-avail?est=${est}&covers=${numGuests}&date=${formattedDate}`;
    console.log(`Fetching: ${apiUrl}`);

    try {
      const response = await fetch(apiUrl);
      if (!response.ok) {
         const errorText = await response.text();
         console.error("API Error Response Text:", errorText);
        throw new Error(`No availability or error fetching data. Status: ${response.status}.`);
      }
      const data = await response.json();
      setAvailabilityData(data);
      if ((!data.shifts || data.shifts.length === 0) && !data.message) {
        setApiError("No availability found for the selected date and guest count.");
      }
    } catch (error) {
      console.error("Error fetching availability:", error);
      setApiError(error.message || "Failed to fetch availability. Please check your connection or try again.");
      setAvailabilityData(null);
    } finally {
      setIsLoading(false);
    }
  }, [est]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedFetchAvailability = useCallback(debounce(fetchAvailability, 800), [fetchAvailability]);

  useEffect(() => {
    const numericGuests = parseInt(guests, 10);
    if (selectedDate && !isNaN(numericGuests) && numericGuests > 0) {
      debouncedFetchAvailability(selectedDate, numericGuests);
    } else {
      // If inputs are invalid (e.g. guests cleared), clear data, errors, and pending calls.
      debouncedFetchAvailability.clear();
      setAvailabilityData(null);
      setApiError(null);
      setIsLoading(false);
    }
    // Cleanup function to clear timeout if component unmounts or dependencies change
    return () => {
      debouncedFetchAvailability.clear();
    };
  }, [selectedDate, guests, debouncedFetchAvailability]);


  return (
    <div className="p-6 max-w-xl mx-auto bg-white shadow-xl rounded-lg space-y-6">
      <h1 className="text-3xl font-bold text-center text-gray-800">Book Your Table</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <CalendarPicker date={selectedDate} onChange={handleDateChange} />
        <GuestSelector value={guests} onChange={handleGuestsChange} />
      </div>

      {isLoading && (
        <div className="flex justify-center items-center py-6">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          <p className="ml-3 text-blue-500">Loading availability...</p>
        </div>
      )}

      {apiError && !isLoading && (
        <div className="my-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-md shadow-sm" role="alert">
          <strong className="font-bold">Oops! </strong>
          <span>{apiError}</span>
        </div>
      )}

      {availabilityData && !isLoading && !apiError && (
        <div className="mt-6 space-y-5">
          <div className="p-4 bg-gray-50 rounded-lg shadow">
            <h3 className="text-2xl font-semibold text-gray-700 mb-2">
              {availabilityData.estFull || availabilityData.est}
            </h3>
            {availabilityData.message && (
              <p className="text-sm p-3 bg-yellow-100 border border-yellow-300 text-yellow-800 rounded-md">
                {availabilityData.message}
              </p>
            )}
          </div>

          {availabilityData.shifts && availabilityData.shifts.length > 0 ? (
            <div className="space-y-4">
              <h4 className="text-xl font-semibold text-gray-700">Available Shifts:</h4>
              {availabilityData.shifts.map((shift, index) => (
                <div key={shift.uid || index} className="p-4 border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow bg-white">
                  <h5 className="text-lg font-bold text-blue-600">{shift.name}
                    <span className="text-sm font-normal text-gray-500 ml-2">({shift.type})</span>
                  </h5>
                  <p className="text-sm text-gray-600 my-1">
                    <span className="font-medium">Duration:</span> {formatDecimalTime(shift.start)} - {formatDecimalTime(shift.end)}
                  </p>
                  {shift.description && (
                    <div
                      className="mt-2 text-sm text-gray-700 prose prose-sm max-w-none bg-gray-50 p-2 rounded"
                      dangerouslySetInnerHTML={{ __html: shift.description }}
                    />
                  )}
                  {shift.message && (
                     <p className="text-xs mt-2 p-2 bg-blue-50 border border-blue-200 text-blue-700 rounded">
                       {shift.message}
                     </p>
                  )}
                  {shift.times && shift.times.length > 0 ? (
                    <div className="mt-3">
                      <p className="text-sm font-semibold text-gray-800 mb-2">Available Booking Times:</p>
                      <div className="flex flex-wrap gap-2">
                        {shift.times.map((time, timeIndex) => (
                          <button
                            key={timeIndex}
                            className="px-3 py-1.5 bg-green-500 text-white text-sm font-medium rounded-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50 transition-colors"
                          >
                            {formatDecimalTime(time)}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 mt-2 italic">No specific online booking times listed for this shift. Please contact us for details.</p>
                  )}
                </div>
              ))}
            </div>
          ) : (
             (!availabilityData.message && !apiError) && // Show only if no general message or API error already covers this
            <p className="text-center text-gray-600 py-4 text-lg">No shifts currently available for the selected criteria.</p>
          )}
        </div>
      )}
    </div>
  );
}
