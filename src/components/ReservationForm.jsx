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
  const EFFECTIVE_CURRENCY_SYMBOL = '$'; // Hardcoded currency symbol

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
  const [selectedAddons, setSelectedAddons] = useState({ menus: [], options: {} }); // Refactored state
  const [currentShiftAddons, setCurrentShiftAddons] = useState([]);
  const [currentShiftUsagePolicy, setCurrentShiftUsagePolicy] = useState(null); // Applies to Menus

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
    let rawAddons = timeObject?.addons || shift?.addons || [];
    const usagePolicyForShift = timeObject?.usage !== undefined ? timeObject.usage : shift?.usage;

    // Augment Menu addons with originalIndex
    let menuOriginalIndexCounter = 0;
    const processedAddons = rawAddons.map(addon => {
      if (addon.type === "Menu") {
        return { ...addon, originalIndex: menuOriginalIndexCounter++ };
      }
      return addon;
    });

    console.log("Processed addons for selected shift/time (with originalIndex for Menus):", processedAddons);
    console.log("Usage policy for selected shift/time (applies to Menus):", usagePolicyForShift);

    setCurrentShiftAddons(processedAddons);
    setCurrentShiftUsagePolicy(usagePolicyForShift === undefined ? null : Number(usagePolicyForShift)); // Ensure it's a number or null

    // Reset any previously selected addons
    setSelectedAddons({ menus: [], options: {} }); // Reset to new structure

    // Future: Scroll to addon section or make it prominent
  };

  const handleAddonSelectionChange = (addonType, addonData, value, eventType, menuUsagePolicy) => {
    setSelectedAddons(prev => {
      const newSelected = JSON.parse(JSON.stringify(prev)); // Deep copy

      if (addonType === 'menu') {
        const menuIndex = newSelected.menus.findIndex(m => m.uid === addonData.uid);

        if (menuUsagePolicy === 1) { // Radio buttons for Menus
          if (value) { // value is true if selected
            newSelected.menus = [{ ...addonData }]; // Replace with the single selected menu
          } else {
            // Should not happen with radios if one is always selected, but as safeguard:
            newSelected.menus = [];
          }
        } else if (menuUsagePolicy === 2) { // Quantity selectors for Menus
          const quantity = parseInt(value, 10);
          if (quantity > 0) {
            if (menuIndex > -1) {
              newSelected.menus[menuIndex].quantity = quantity;
            } else {
              newSelected.menus.push({ ...addonData, quantity });
            }
          } else { // Quantity is 0 or less
            if (menuIndex > -1) {
              newSelected.menus.splice(menuIndex, 1);
            }
          }
        } else if (menuUsagePolicy === 3) { // Checkboxes for Menus
          const numericGuests = parseInt(guests, 10) || 0;
          const maxSelections = selectedShiftTime?.maxMenuTypes > 0
                                ? selectedShiftTime.maxMenuTypes
                                : numericGuests > 0 ? numericGuests : 1;

          if (value) { // Checkbox is checked
            if (menuIndex === -1 && newSelected.menus.length < maxSelections) {
              newSelected.menus.push({ ...addonData });
            } else if (menuIndex === -1 && newSelected.menus.length >= maxSelections) {
              // Attempted to select more than allowed, do nothing or alert user (UI should prevent this)
              console.warn(`Cannot select more than ${maxSelections} menu(s).`);
              return prev; // Revert to previous state
            }
          } else { // Checkbox is unchecked
            if (menuIndex > -1) {
              newSelected.menus.splice(menuIndex, 1);
            }
          }
        }
      } else if (addonType === 'option') {
        const quantity = parseInt(value, 10);
        const numericGuests = parseInt(guests, 10) || 0;

        // Validate quantity against option's own min/max and guest count
        const optionMinQty = (typeof addonData.min === 'number' && !isNaN(addonData.min)) ? addonData.min : 0;
        const optionMaxQty = (typeof addonData.max === 'number' && !isNaN(addonData.max)) ? addonData.max : Infinity;
        const maxAllowedByGuestCount = numericGuests > 0 ? numericGuests : Infinity;

        const effectiveMaxQty = Math.min(optionMaxQty, maxAllowedByGuestCount);

        if (quantity > 0 && quantity >= optionMinQty && quantity <= effectiveMaxQty) {
          newSelected.options[addonData.uid] = quantity;
        } else if (quantity <= 0 || quantity < optionMinQty) { // Also remove if below explicit min for option
            delete newSelected.options[addonData.uid];
        } else if (quantity > effectiveMaxQty) {
            // Quantity exceeds max allowed, clamp it to max (UI should prevent this, but good safeguard)
            newSelected.options[addonData.uid] = effectiveMaxQty;
            console.warn(`Quantity for option ${addonData.name} clamped to ${effectiveMaxQty}.`);
        }
      }
      console.log("Updated selectedAddons:", newSelected);
      return newSelected;
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
          currencySymbol={EFFECTIVE_CURRENCY_SYMBOL} // Pass hardcoded currency symbol
          languageStrings={appConfig?.lng} // Pass language strings
          selectedShiftTime={selectedShiftTime} // Pass full selectedShiftTime object for maxMenuTypes etc.
        />
      )}

      {selectedShiftTime && (
        <SelectedAddonsSummary
          selectedAddons={selectedAddons}
          currencySymbol={EFFECTIVE_CURRENCY_SYMBOL} // Pass hardcoded currency symbol
          languageStrings={appConfig?.lng}
          guestCount={guests}
          currentShiftAddons={currentShiftAddons} // Pass current shift addons for option details lookup
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
