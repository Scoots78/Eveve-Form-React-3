import React, { useState, useEffect, useCallback } from "react";
import GuestSelector from "./guestSelector";
import CalendarPicker from "./CalendarPicker";
import { format } from 'date-fns';
import { loadAppConfig } from "../config/configLoader"; // Import the config loader
import { formatDecimalTime } from "../utils/time"; // Import the utility function
import { useDebounce } from "../hooks/useDebounce"; // Import the custom hook
import AddonSelection from "./AddonSelection"; // Import the new component
import SelectedAddonsSummary from "./SelectedAddonsSummary"; // Import the summary component
import { formatSelectedAddonsForApi } from "../utils/apiFormatter"; // Import the formatter


export default function ReservationForm() {
  const urlParams = new URLSearchParams(window.location.search);
  const est = urlParams.get("est"); // Removed fallback to "testnza"

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [guests, setGuests] = useState(''); // Initial state: empty string for placeholder

  const [appConfig, setAppConfig] = useState(null);
  const [isConfigLoading, setIsConfigLoading] = useState(true);
  const [configError, setConfigError] = useState(null);

  const [availabilityData, setAvailabilityData] = useState(null);
  const [isLoading, setIsLoading] = useState(false); // For availability loading
  const [apiError, setApiError] = useState(null); // For availability API errors

  // State for addon selection
  const [selectedShiftTime, setSelectedShiftTime] = useState(null);
  const [selectedAddons, setSelectedAddons] = useState({ usage1: null, usage2: [], usage3: [] });
  const [currentShiftAddons, setCurrentShiftAddons] = useState([]);
  const [currentShiftUsagePolicy, setCurrentShiftUsagePolicy] = useState(null);

  useEffect(() => {
    const fetchConfig = async () => {
      // Check if est is present before trying to load config
      if (!est) {
        setConfigError("No restaurant ID (est) provided in the URL.");
        setIsConfigLoading(false);
        return;
      }

      try {
        setIsConfigLoading(true);
        setConfigError(null);
        const config = await loadAppConfig(est);
        setAppConfig(config);
        console.log("App Config Loaded:", config); // For verification

        if (config && !config.estFull) {
          console.error("Essential configuration missing: estFull is not defined in the loaded config.", config);
          setConfigError(config?.lng?.errorB || "Essential restaurant information (name) is missing. Unable to proceed.");
          // No need to setIsConfigLoading(false) here as it's done in finally, but ensure form doesn't render.
        } else if (config) {
            // Example: Access a loaded config variable
            if (config.estName) {
              console.log("Restaurant Name from Config:", config.estName);
            }
            if (config.partyMin) {
                console.log("Min Guests from Config:", config.partyMin);
            }
            if (config.partyMax) {
                 console.log("Max Guests from Config:", config.partyMax);
            }
        }
        // If config itself is null/undefined (error caught by catch block), configError will already be set.
      } catch (error) {
        console.error("Failed to load app configuration:", error);
        // Use a generic error message or one from lng if appConfig was partially loaded or defaults exist
        setConfigError(error.message || (appConfig?.lng?.errorB || "Failed to load application configuration."));
      } finally {
        setIsConfigLoading(false);
      }
    };

    if (est) {
      fetchConfig();
    }
  }, [est, appConfig?.lng?.errorB]); // Added appConfig.lng.errorB to deps for stable error message

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

  const fetchAvailability = useCallback(async (date, numGuests) => {
    if (!date || typeof numGuests !== 'number' || numGuests < 1 || !appConfig) {
      setAvailabilityData(null);
      setApiError(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setApiError(null);
    const formattedDate = format(date, 'yyyy-MM-dd');

    // Use dapi from config if available, otherwise fallback to hardcoded domain
    const baseApiUrl = appConfig.dapi || "https://nz6.eveve.com";
    const apiUrl = `${baseApiUrl}/web/day-avail?est=${est}&covers=${numGuests}&date=${formattedDate}`;
    console.log(`Fetching: ${apiUrl}`);

    try {
      const response = await fetch(apiUrl);
      if (!response.ok) {
         const errorText = await response.text();
         console.error("API Error Response Text:", errorText);
        throw new Error(appConfig?.lng?.noAvailRange || `No availability or error fetching data. Status: ${response.status}.`);
      }
      const data = await response.json();
      setAvailabilityData(data);
      if ((!data.shifts || data.shifts.length === 0) && !data.message) {
        setApiError(appConfig?.lng?.legendUnavail || "No availability found for the selected date and guest count.");
      }
    } catch (error) {
      console.error("Error fetching availability:", error);
      setApiError(error.message || (appConfig?.lng?.eventPax || "Failed to fetch availability. Please check your connection or try again."));
      setAvailabilityData(null);
    } finally {
      setIsLoading(false);
    }
  }, [est, appConfig]);

  const [debouncedFetchAvailability, clearDebouncedFetchAvailability] = useDebounce(fetchAvailability, 800);

  useEffect(() => {
    const numericGuests = parseInt(guests, 10);
    if (selectedDate && !isNaN(numericGuests) && numericGuests > 0) {
      debouncedFetchAvailability(selectedDate, numericGuests);
    } else {
      // If inputs are invalid (e.g. guests cleared), clear data, errors, and pending calls.
      clearDebouncedFetchAvailability();
      setAvailabilityData(null);
      setApiError(null);
      setIsLoading(false);
    }
    // Cleanup function to clear timeout if component unmounts or dependencies change
    return () => {
      clearDebouncedFetchAvailability();
    };
  }, [selectedDate, guests, debouncedFetchAvailability, clearDebouncedFetchAvailability]);

  const handleTimeSelection = (shift, timeObject) => {
    // Assuming timeObject could be just the decimal time, or an object containing the time
    const actualTime = typeof timeObject === 'object' ? timeObject.time : timeObject;
    console.log("Selected Shift:", shift);
    console.log("Selected Time Object:", timeObject);

    setSelectedShiftTime({
      ...shift, // Spread shift properties
      selectedTime: actualTime, // Add the specific time selected
      // If timeObject has its own addons/usage, prioritize them, else use shift's
      addons: timeObject?.addons || shift?.addons || [],
      usage: timeObject?.usage !== undefined ? timeObject.usage : shift?.usage
    });

    // Extract addons and usage policy from the shift or specific time slot
    // The README suggests addons and usage are typically on the shift object.
    // If a time slot can override this, timeObject might contain its own addons/usage.
    const addonsForShift = timeObject?.addons || shift?.addons || [];
    const usagePolicyForShift = timeObject?.usage !== undefined ? timeObject.usage : shift?.usage;

    console.log("Addons for selected shift/time:", addonsForShift);
    console.log("Usage policy for selected shift/time:", usagePolicyForShift);

    setCurrentShiftAddons(addonsForShift);
    setCurrentShiftUsagePolicy(usagePolicyForShift === undefined ? null : Number(usagePolicyForShift)); // Ensure it's a number or null

    // Reset any previously selected addons
    setSelectedAddons({ usage1: null, usage2: [], usage3: [] });

    // Future: Scroll to addon section or make it prominent
  };

  const handleAddonSelectionChange = (usagePolicyType, addonData, value) => {
    setSelectedAddons(prevSelectedAddons => {
      const newSelectedAddons = JSON.parse(JSON.stringify(prevSelectedAddons)); // Deep copy

      switch (usagePolicyType) {
        case 'usage1':
          if (value) { // value is true if checked/selected, false if unchecked (for single checkbox mode)
            newSelectedAddons.usage1 = { ...addonData };
          } else {
            // This case is mainly for when a single checkbox (not radio) is unchecked.
            // For radio buttons, another radio being selected implicitly deselects others.
            // If multiple addons are rendered as radios, selecting one will trigger this with value=true.
            // If it's a single addon as a checkbox, unchecking it comes here.
            newSelectedAddons.usage1 = null;
          }
          break;

        case 'usage2':
          const quantity = parseInt(value, 10); // value is the new quantity
          const index = newSelectedAddons.usage2.findIndex(item => item.uid === addonData.uid);

          if (quantity > 0) {
            if (index > -1) {
              newSelectedAddons.usage2[index].quantity = quantity;
            } else {
              newSelectedAddons.usage2.push({ ...addonData, quantity });
            }
          } else {
            if (index > -1) {
              newSelectedAddons.usage2.splice(index, 1);
            }
          }
          // Constraint: Total quantity of usage 2 addons should not exceed guest count.
          // This constraint is partially handled by disabling buttons in AddonSelection.
          // Here, we could add a final check if needed, though UI should prevent invalid states.
          // For example, if guest count is suddenly reduced after selection, this logic might need to adjust.
          // However, the current setup re-filters addons if guest count changes, which should reset selections or hide invalid ones.
          break;

        case 'usage3': // Also handles usage0/default
          const existingIndex = newSelectedAddons.usage3.findIndex(item => item.uid === addonData.uid);
          if (value) { // value is true if checked
            if (existingIndex === -1) {
              newSelectedAddons.usage3.push({ ...addonData });
            }
          } else { // value is false if unchecked
            if (existingIndex > -1) {
              newSelectedAddons.usage3.splice(existingIndex, 1);
            }
          }
          break;
        default:
          console.warn("Unknown usage policy type:", usagePolicyType);
      }
      console.log("Updated selectedAddons:", newSelectedAddons);
      return newSelectedAddons;
    });
  };

  const handleProceedToBooking = () => {
    if (!selectedDate || !guests || !selectedShiftTime || !selectedShiftTime.selectedTime) {
      alert(appConfig?.lng?.fillAllFields || "Please select date, guests, and a time before proceeding.");
      return;
    }

    const numericGuests = parseInt(guests, 10);
    const formattedDate = format(selectedDate, 'yyyy-MM-dd');
    const formattedTime = selectedShiftTime.selectedTime; // This is already in decimal format like 12.25
    const formattedAddons = formatSelectedAddonsForApi(selectedAddons);

    const bookingDataForHold = {
      est: est, // From URL params
      lng: appConfig?.usrLang || 'en', // From appConfig
      covers: numericGuests,
      date: formattedDate,
      time: formattedTime,
      addons: formattedAddons, // May be an empty string if no addons selected
      // Potentially other details from appConfig or selectedShiftTime if needed by hold API
      // e.g., shiftUid: selectedShiftTime.uid,
    };

    console.log("Proceeding to Booking (Hold API Call Placeholder)");
    console.log("Booking Data for Hold:", bookingDataForHold);
    alert(`Hold Request Data (see console for details):\nDate: ${formattedDate}\nTime: ${formatDecimalTime(formattedTime, appConfig?.timeFormat)}\nGuests: ${numericGuests}\nAddons: ${formattedAddons || 'None'}`);

    // In a real scenario, this would be an API call:
    // try {
    //   const response = await fetch(`https://nz6.eveve.com/web/hold`, {
    //     method: 'POST', // Or GET, depending on API spec for hold with addons
    //     headers: { 'Content-Type': 'application/json' },
    //     body: JSON.stringify(bookingDataForHold),
    //   });
    //   const result = await response.json();
    //   if (result.ok) {
    //     console.log("Hold successful:", result);
    //     // Navigate to next step, e.g., customer details form, passing result.uid
    //   } else {
    //     console.error("Hold failed:", result);
    //     setApiError(result.message || appConfig?.lng?.errorHold || "Failed to hold booking.");
    //   }
    // } catch (error) {
    //   console.error("Error during hold booking:", error);
    //   setApiError(appConfig?.lng?.errorServer || "Server error during hold booking.");
    // }
  };

  if (isConfigLoading) {
    return (
      <div className="p-6 max-w-xl mx-auto bg-white shadow-xl rounded-lg space-y-6 text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500 mx-auto"></div>
        <p className="text-xl text-blue-600 mt-4">
          {appConfig?.lng?.loading || 'Loading configuration...'}
        </p>
      </div>
    );
  }

  if (configError) {
    return (
      <div className="p-6 max-w-xl mx-auto bg-red-100 shadow-xl rounded-lg space-y-4 text-center border border-red-400">
        <h2 className="text-2xl font-bold text-red-700">
          {appConfig?.lng?.errorB || 'Configuration Error'}
        </h2>
        <p className="text-red-600">{configError}</p>
        <p className="text-sm text-gray-600">
          {appConfig?.lng?.invPhone || 'Please ensure the \'est\' parameter in the URL is correct or try again later.'}
        </p>
      </div>
    );
  }

  // Render form only if config is loaded and no errors
  return (
    <div className="p-6 max-w-xl mx-auto bg-white shadow-xl rounded-lg space-y-6">
      <h1 className="text-3xl font-bold text-center text-gray-800">
        {/* Simplified: If we reach here, appConfig and appConfig.estFull must exist due to checks above */}
        {`Make a Booking at ${appConfig.estFull}`}
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <CalendarPicker
          date={selectedDate}
          onChange={handleDateChange}
          dateFormat={appConfig?.dateFormat} // Pass dateFormat from config
          disablePast={appConfig?.disablePast === 'true' || appConfig?.disablePast === true} // Pass disablePast from config
        />
        <GuestSelector
          value={guests}
          onChange={handleGuestsChange}
          minGuests={appConfig?.partyMin || 1}
          maxGuests={appConfig?.partyMax || 10}
          guestLabel={appConfig?.lng?.guest}
          guestsLabel={appConfig?.lng?.guests || appConfig?.lng?.partySize}
        />
      </div>

      {isLoading && ( // This is for availability loading
        <div className="flex justify-center items-center py-6">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          <p className="ml-3 text-blue-500">
            {appConfig?.lng?.loading || 'Loading availability...'}
          </p>
        </div>
      )}

      {apiError && !isLoading && ( // This is for availability API error
        <div className="my-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-md shadow-sm" role="alert">
          <strong className="font-bold">Oops! </strong>
          <span>{apiError}</span>
        </div>
      )}

      {availabilityData && !isLoading && !apiError && (
        <div className="mt-6 space-y-5">
          <div className="p-4 bg-gray-50 rounded-lg shadow">
            <h3 className="text-2xl font-semibold text-gray-700 mb-2">
              {/* Prefer estFull from appConfig if available, then from availabilityData, then fallback */}
              {appConfig?.estFull || availabilityData.estFull || availabilityData.est}
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
                    <span className="font-medium">{appConfig?.lng?.time || 'Time'}:</span> {formatDecimalTime(shift.start, appConfig?.timeFormat)} - {formatDecimalTime(shift.end, appConfig?.timeFormat)}
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
                        {shift.times.map((timeObj, timeIndex) => ( // Assuming time is an object { time: decimal, ...any other props } or just decimal
                          <button
                            key={timeIndex}
                            onClick={() => handleTimeSelection(shift, timeObj)} // timeObj might just be the decimal time
                            className="px-3 py-1.5 bg-green-500 text-white text-sm font-medium rounded-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50 transition-colors"
                          >
                            {formatDecimalTime(typeof timeObj === 'object' ? timeObj.time : timeObj, appConfig?.timeFormat)}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 mt-2 italic">
                      {appConfig?.lng?.legendUnavail || 'No specific online booking times listed for this shift. Please contact us for details.'}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
             (!availabilityData.message && !apiError) &&
            <p className="text-center text-gray-600 py-4 text-lg">
              {appConfig?.lng?.legendClosed || 'No shifts currently available for the selected criteria.'}
            </p>
          )}
        </div>
      )}

      {selectedShiftTime && currentShiftAddons && currentShiftAddons.length > 0 && !isLoading && !apiError && (
        <AddonSelection
          currentShiftAddons={currentShiftAddons}
          currentShiftUsagePolicy={currentShiftUsagePolicy}
          selectedAddons={selectedAddons}
          onAddonChange={handleAddonSelectionChange} // This function will be created in the next step
          guestCount={guests} // Pass guest count for filtering and usage policy 2 logic
          currencySymbol={appConfig?.currSym || '$'} // Pass currency symbol
          languageStrings={appConfig?.lng} // Pass language strings
        />
      )}

      {selectedShiftTime && (
        <SelectedAddonsSummary
          selectedAddons={selectedAddons}
          currencySymbol={appConfig?.currSym || '$'}
          languageStrings={appConfig?.lng}
          guestCount={guests}
        />
      )}

      {selectedShiftTime && (
        <div className="mt-8 text-center">
          <button
            onClick={handleProceedToBooking}
            className="px-6 py-3 bg-purple-600 text-white text-lg font-semibold rounded-lg shadow-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-75 transition-all duration-150 ease-in-out"
          >
            {appConfig?.lng?.proceedToBookingBtn || "Proceed to Booking (Placeholder)"}
          </button>
        </div>
      )}
    </div>
  );
}
