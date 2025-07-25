import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
  startTransition
} from "react";
import GuestSelector from "./guestSelector";
import ReactCalendarPicker from "./ReactCalendarPicker";
import { format } from 'date-fns';
import { loadAppConfig } from "../config/configLoader"; // Import the config loader
import { formatDecimalTime } from "../utils/time"; // Import the utility function
import { useDebounce } from "../hooks/useDebounce"; // Import the custom hook
import AddonSelection from "./AddonSelection"; // Import the new component
import SelectedAddonsSummary from "./SelectedAddonsSummary"; // Import the summary component
import {
  formatSelectedAddonsForApi,
  formatAddonsForDisplay,
  formatAreaForApi,
  formatCustomerDetails
} from "../utils/apiFormatter"; // Import formatters
import AreaSelection from "./AreaSelection"; // NEW – import the area selector component
import { useHoldBooking, useUpdateHold } from "../hooks/booking";
import { BookingDetailsModal } from "./booking";
// Month availability utilities
import {
  fetchMonthAvailability,
  parseClosedDatesFromMonthResponse,
  defaultCoversForMonthAvail
} from "../utils/monthAvailability";


export default function ReservationForm() {
  const EFFECTIVE_CURRENCY_SYMBOL = '$'; // Hardcoded currency symbol
  
  // Ref to prevent multiple config loads
  const configLoadedRef = useRef(false);

  const urlParams = new URLSearchParams(window.location.search);
  const est = urlParams.get("est"); // Removed fallback to "testnza"

  /* ------------------------------------------------------------------
     Treat date as "unset" on initial load so the GuestSelector container
     does NOT appear until the user actively picks a date.
  ------------------------------------------------------------------ */
  const [selectedDate, setSelectedDate] = useState(null);
  const [guests, setGuests] = useState(''); // Initial state: empty string for placeholder
  const [selectedDateForSummary, setSelectedDateForSummary] = useState(null);
  const [selectedGuestsForSummary, setSelectedGuestsForSummary] = useState(null);
  const [showDateTimePicker, setShowDateTimePicker] = useState(true);

  const [appConfig, setAppConfig] = useState(null);
  const [isConfigLoading, setIsConfigLoading] = useState(true);
  const [configError, setConfigError] = useState(null);

  const [availabilityData, setAvailabilityData] = useState(null);
  const [isLoading, setIsLoading] = useState(false); // For availability loading
  const [apiError, setApiError] = useState(null); // For availability API errors

  // State for accordion: stores UID or index of the expanded shift
  const [expandedShiftIdentifier, setExpandedShiftIdentifier] = useState(null);

  // State for addon selection
  // selectedShiftTime will now also store originalIndexInAvailabilityData to help identify the shift context
  const [selectedShiftTime, setSelectedShiftTime] = useState(null);
  const [selectedAddons, setSelectedAddons] = useState({ menus: [], options: {} }); // Refactored state
  const [currentShiftAddons, setCurrentShiftAddons] = useState([]);
  const [currentShiftUsagePolicy, setCurrentShiftUsagePolicy] = useState(null); // Applies to Menus

  // --- Area selection state ---
  const [availableAreas, setAvailableAreas] = useState([]);      // Areas available for the currently selected time
  const [selectedArea, setSelectedArea] = useState(null);        // The UID / id of the chosen area (or "any")
  const [selectedAreaName, setSelectedAreaName] = useState(null); // Store the name of the selected area for display
  
  // --- Booking flow state ---
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [bookingData, setBookingData] = useState(null);
  const [bookingState, setBookingState] = useState({
    isHolding: false,
    holdError: null,
    isUpdating: false,
    updateError: null,
    isBooking: false,
    bookingError: null,
    bookingSuccess: false
  });

  // State for the proceed button
  const [proceedButtonState, setProceedButtonState] = useState({
    text: appConfig?.lng?.selectTimePrompt || "Select a Time to Proceed", // Initial state
    disabled: true,
  });

  /* ------------------------------------------------------------------
     Normalised flag – true when "Any Area" is allowed.  We convert both
     boolean true and string 'true' from the remote config to a boolean.
     This is needed in multiple places (render + validation), so compute
     it once at component level.
  ------------------------------------------------------------------ */
  // Initialize booking hooks
  const baseApiUrl = appConfig?.dapi || "https://nz6.eveve.com";
  const { holdBooking, isLoading: isHoldLoading, error: holdError, holdData, clearHoldData } = useHoldBooking(baseApiUrl);
  const { updateHold, isLoading: isUpdateLoading, error: updateError } = useUpdateHold(baseApiUrl);

  const areaAnyAllowed =
    appConfig?.areaAny === true || appConfig?.areaAny === 'true';

  // -----------------------------------------------------------
  // Month-availability state
  // -----------------------------------------------------------
  // 1) Map monthKey → array of closed Date objects
  const [monthClosedDates, setMonthClosedDates] = useState({});
  // 2) Cache of monthKeys we have already fetched
  const [fetchedMonths, setFetchedMonths] = useState(() => new Set());
  // 3) Loading flag limited to month-availability calls
  const [isMonthAvailLoading, setIsMonthAvailLoading] = useState(false);
  // Flag to suppress re-entrant onMonthChange while React state updates render
  const isUpdatingMonthDataRef = useRef(false);
  // Track if we've fetched the very first month already
  const initialMonthFetchedRef = useRef(false);
  // Prevent concurrent month-availability fetches
  const monthFetchInProgressRef = useRef(false);


  useEffect(() => {
    const fetchConfig = async () => {
      // Check if config has already been loaded or is loading
      if (configLoadedRef.current) {
        console.log("Config already loaded, skipping duplicate load");
        return;
      }
      
      // Check if est is present before trying to load config
      if (!est) {
        setConfigError("No restaurant ID (est) provided in the URL.");
        setIsConfigLoading(false);
        return;
      }

      try {
        configLoadedRef.current = true;
        setIsConfigLoading(true);
        setConfigError(null);
        console.log(`Loading app configuration for est=${est}`);
        
        const config = await loadAppConfig(est);
        setAppConfig(config);
        console.log("App Config Loaded:", config); // For verification

        if (config && !config.estFull) {
          console.error("Essential configuration missing: estFull is not defined in the loaded config.", config);
          setConfigError(config?.lng?.errorB || "Essential restaurant information (name) is missing. Unable to proceed.");
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
      } catch (error) {
        console.error("Failed to load app configuration:", error);
        // Use a generic error message or one from lng if appConfig was partially loaded or defaults exist
        setConfigError(error.message || "Failed to load application configuration.");
        configLoadedRef.current = false; // Reset ref to allow retry
      } finally {
        setIsConfigLoading(false);
      }
    };

    if (est && !configLoadedRef.current) {
      fetchConfig();
    }
  }, [est]); // Removed appConfig?.lng?.errorB from deps to prevent multiple calls

  // -----------------------------------------------------------
  // Initial month-availability fetch (ONLY current month)
  // -----------------------------------------------------------
  useEffect(() => {
    const fetchCurrentMonthAvailability = async () => {
      /* --------------------------------------------------------
         Guard: ensure this effect runs only once.
         If we've already fetched the first month, exit early.
         -------------------------------------------------------- */
      if (initialMonthFetchedRef.current) return;

      // Abort if prerequisites are not satisfied
      if (!appConfig || configError || isMonthAvailLoading) return;
      
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1; // 1-based month
      const monthKey = `${currentYear}-${String(currentMonth).padStart(2, "0")}`;
      
      // Skip if we already have this month's data
      if (fetchedMonths.has(monthKey)) {
        console.log(`Month availability for ${monthKey} already cached, skipping fetch`);
        return;
      }

      // Mark as fetched only when we are sure we intend to fetch (or have verified cache)
      // This prevents the effect from running again in the same session.
      initialMonthFetchedRef.current = true;

      try {
        console.log(`Fetching initial month availability for current month: ${monthKey}`);
        setIsMonthAvailLoading(true);
        
        const monthData = await fetchMonthAvailability(
          est,
          currentYear,
          currentMonth,
          appConfig.dapi || "https://nz.eveve.com"
        );
        
        if (monthData) {
          const closedDatesArr = parseClosedDatesFromMonthResponse(
            monthData,
            currentYear,
            currentMonth
          );
          console.log(
            `Found ${closedDatesArr.length} closed dates for ${monthKey}`
          );
          // Cache month's closed dates
          setMonthClosedDates((prev) => ({ ...prev, [monthKey]: closedDatesArr }));
          
          // Add to fetched months cache
          setFetchedMonths(prev => {
            const next = new Set(prev);
            next.add(monthKey);
            return next;
          });
        }
      } catch (err) {
        console.error(`Error fetching month availability for ${monthKey}:`, err);
      } finally {
        setIsMonthAvailLoading(false);
      }
    };
    fetchCurrentMonthAvailability();
  }, [appConfig, configError, est]); // fetchedMonths removed to avoid unwanted re-runs

  // -----------------------------------------------------------
  // Handle calendar month navigation
  // -----------------------------------------------------------
  const handleMonthChange = useCallback(async (_selected, _dateStr, instance) => {
    console.groupCollapsed(
      `%c[handleMonthChange] fired – yr:${instance.currentYear} m:${instance.currentMonth + 1}`,
      "color:orange;font-weight:bold"
    );
    if (!appConfig) {
      console.log("%cNo appConfig – aborting", "color:red");
      console.groupEnd();
      return;
    }
    // Avoid overlaps
    if (monthFetchInProgressRef.current || isUpdatingMonthDataRef.current) {
      console.log("%cOverlap or React update in progress – aborting", "color:red");
      console.groupEnd();
      return;
    }
    
    const year = instance.currentYear;
    const monthZeroBased = instance.currentMonth; // flatpickr 0-based
    const month = monthZeroBased + 1;
    const monthKey = `${year}-${String(month).padStart(2, "0")}`;

    // Skip if we already have this month's data
    if (fetchedMonths.has(monthKey)) {
      console.log(`Month availability for ${monthKey} already cached, skipping fetch`);
      return;
    }

    try {
      console.log(`User navigated to new month: ${monthKey}, fetching availability`);
      setIsMonthAvailLoading(true);
      isUpdatingMonthDataRef.current = true;        // suppress re-entrant calls
      monthFetchInProgressRef.current = true;
      
      const monthData = await fetchMonthAvailability(
        est,
        year,
        month,
        appConfig.dapi || "https://nz.eveve.com"
      );
      
      if (monthData) {
        const newClosed = parseClosedDatesFromMonthResponse(
          monthData,
          year,
          month
        );
        console.log(`Found ${newClosed.length} closed dates for ${monthKey}`);
        // Cache without triggering immediate calendar re-render loops
        console.log("%cCaching closed dates & month key (startTransition)", "color:blue");
        startTransition(() => {
          console.log("%c→ setMonthClosedDates", "color:blue");
          setMonthClosedDates((prev) => ({ ...prev, [monthKey]: newClosed }));
          console.log("%c→ setFetchedMonths", "color:blue");
          setFetchedMonths((prev) => {
            const next = new Set(prev);
            next.add(monthKey);
            return next;
        });

        });
      }
    } catch (err) {
      console.error(`Error fetching month availability for ${monthKey}:`, err);
    } finally {
      console.timeEnd(`[monthFetch] ${monthKey}`);
      setIsMonthAvailLoading(false);
      monthFetchInProgressRef.current = false;
      isUpdatingMonthDataRef.current = false;       // re-enable callback
      console.groupEnd();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    appConfig,
    est
    /* -----------------------------------------------------------
       NOTE:
       fetchedMonths is intentionally NOT included in the dependency
       array.  Including it would create a new handleMonthChange
       reference every time we cache a month, which causes react-calendar
       to re-initialise and emit an extra onActiveStartDateChange event.
       The internal refs (monthFetchInProgressRef, fetchedMonths Set)
       are sufficient for correctness and prevent duplicate calls.
    ----------------------------------------------------------- */
  ]);

  /* ------------------------------------------------------------------
     Derive flat array of disabled dates for ReactCalendarPicker whenever
     monthClosedDates changes. useMemo prevents unnecessary re-renders.
  ------------------------------------------------------------------ */
  const disabledDates = useMemo(
    () =>
      Object.values(monthClosedDates).reduce(
        (all, arr) => all.concat(arr),
        []
      ),
    [monthClosedDates]
  );

  /* ------------------------------------------------------------------
     DEBUG: log whenever monthClosedDates or disabledDates change
  ------------------------------------------------------------------ */
  useEffect(() => {
    console.log(
      `%c[monthClosedDates] updated – months cached: ${Object.keys(monthClosedDates).join(
        ", "
      )}`,
      "color:purple;font-weight:bold"
    );
  }, [monthClosedDates]);

  useEffect(() => {
    console.log(
      `%c[disabledDates] length: ${disabledDates.length}`,
      "color:teal;font-style:italic"
    );
  }, [disabledDates]);

  const handleDateChange = (dates) => {
    if (dates && dates.length > 0) {
      setSelectedDate(dates[0]);
      // Clear previous results and errors when date changes, useEffect will trigger new fetch
      setAvailabilityData(null);
      setApiError(null);
      setShowDateTimePicker(true); // Show pickers when date changes
    }
  };

  const handleGuestsChange = (newGuestValue) => {
    setGuests(newGuestValue);
    // Clear previous results and errors when guests change, useEffect will trigger new fetch or clear
    setAvailabilityData(null);
    setApiError(null);
    setShowDateTimePicker(true); // Show pickers when guests change
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

      // Accordion logic: set default expanded shift identifier (UID or index)
      if (data && data.shifts && data.shifts.length > 0) {
        setSelectedDateForSummary(date);
        setSelectedGuestsForSummary(numGuests);
        setShowDateTimePicker(false); // Hide pickers if shifts are available

        let defaultIdentifier = null;
        const dinnerShiftIndex = data.shifts.findIndex(shift => shift.type === "Dinner");

        if (dinnerShiftIndex !== -1) {
          const dinnerShift = data.shifts[dinnerShiftIndex];
          defaultIdentifier = dinnerShift.uid || dinnerShiftIndex;
        } else {
          // If no "Dinner" shift, expand the first shift (index 0)
          // Prefer its UID if available, otherwise use its index (0)
          const firstShift = data.shifts[0];
          defaultIdentifier = firstShift.uid || 0;
        }
        setExpandedShiftIdentifier(defaultIdentifier);
        if (defaultIdentifier === null && data.shifts.length > 0) {
            // This case should ideally not be reached if there are shifts,
            // as index 0 would be used. Added for robustness.
            console.warn("Could not determine a default shift to expand, using index 0 if available or null.");
            setExpandedShiftIdentifier(data.shifts[0].uid || 0);
        }

      } else {
        setExpandedShiftIdentifier(null); // No shifts, so nothing to expand
        setShowDateTimePicker(true); // Show pickers if no shifts
      }

      if ((!data.shifts || data.shifts.length === 0) && !data.message) {
        setApiError(appConfig?.lng?.legendUnavail || "No availability found for the selected date and guest count.");
        setShowDateTimePicker(true); // Show pickers if no availability
      }
    } catch (error) {
      console.error("Error fetching availability:", error);
      setApiError(error.message || (appConfig?.lng?.eventPax || "Failed to fetch availability. Please check your connection or try again."));
      setAvailabilityData(null);
      setShowDateTimePicker(true); // Show pickers on error
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
      setExpandedShiftIdentifier(null); // Also clear expanded shift
      setShowDateTimePicker(true); // Ensure pickers are shown if inputs become invalid
    }
    // Cleanup function to clear timeout if component unmounts or dependencies change
    return () => {
      clearDebouncedFetchAvailability();
    };
  }, [selectedDate, guests, debouncedFetchAvailability, clearDebouncedFetchAvailability]);

  const handleTimeSelection = (shift, timeObject, shiftIndexInAvailabilityData) => {
    // Assuming timeObject could be just the decimal time, or an object containing the time
    const actualTime = typeof timeObject === 'object' ? timeObject.time : timeObject;
    console.log("Selected Shift (from availability data):", shift);
    console.log("Selected Time Object:", timeObject);
    console.log("Original index of shift in availability data:", shiftIndexInAvailabilityData);

    setSelectedShiftTime({
      ...shift, // Spread shift properties (like name, type, uid if present)
      selectedTime: actualTime, // Add the specific time selected
      // If timeObject has its own addons/usage, prioritize them, else use shift's
      addons: timeObject?.addons || shift?.addons || [], // These are the raw addons for this time/shift
      usage: timeObject?.usage !== undefined ? timeObject.usage : shift?.usage, // Usage policy for menus
      originalIndexInAvailabilityData: shiftIndexInAvailabilityData // Store original index
    });

    // Extract addons and usage policy from the shift or specific time slot
    // The README suggests addons and usage are typically on the shift object.
    // If a time slot can override this, timeObject might contain its own addons/usage.
    let rawAddons = timeObject?.addons || shift?.addons || [];
    const usagePolicyForShift = timeObject?.usage !== undefined ? timeObject.usage : shift?.usage;

    // Augment all addons with originalIndexInShift
    const processedAddons = rawAddons.map((addon, index) => {
      return { ...addon, originalIndexInShift: index };
    });

    console.log("Processed addons for selected shift/time (with originalIndexInShift):", processedAddons);
    console.log("Usage policy for selected shift/time (applies to Menus):", usagePolicyForShift);

    setCurrentShiftAddons(processedAddons);
    setCurrentShiftUsagePolicy(usagePolicyForShift === undefined ? null : Number(usagePolicyForShift)); // Ensure it's a number or null

    /* ------------------------------------------------------------------
       AREA SELECTION HANDLING
       Extract areas from the top-level API response and filter based on the selected time
    ------------------------------------------------------------------ */
    // Reset area selection when a new time is chosen
    setSelectedArea(null);
    setSelectedAreaName(null);

    // Get areas from the top-level of the API response
    const allAreas = availabilityData?.areas || [];
    
    // Filter areas based on whether the selected time is included in the area's times array
    const filteredAreas = allAreas.filter(area => {
      return Array.isArray(area.times) && area.times.includes(actualTime);
    });
    
    console.log(`Found ${filteredAreas.length} areas available for time ${actualTime}:`, filteredAreas);
    setAvailableAreas(filteredAreas);

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
            // Replace with the single selected menu, tagging its usage policy
            newSelected.menus = [{ ...addonData, usagePolicy: menuUsagePolicy }];
          } else {
            // Should not happen with radios if one is always selected, but as safeguard:
            newSelected.menus = [];
          }
        } else if (menuUsagePolicy === 2) { // Quantity selectors for Menus
          const newProposedQuantity = parseInt(value, 10);
          const oldQuantity = prev.menus.find(m => m.uid === addonData.uid)?.quantity || 0; // Ensure we get old quantity correctly even if menuIndex is -1 for new item

          if (newProposedQuantity > oldQuantity) { // Incrementing
            const numericGuests = parseInt(guests, 10) || 0;

            // Rule 1: Sum of quantities constraint (already implemented)
            if (numericGuests > 0) {
              const currentTotalMenuUsage2Quantity = prev.menus.reduce((sum, menu) => {
                if (menu.uid === addonData.uid) return sum; // Exclude current item's old quantity
                return sum + (menu.quantity || 0);
              }, 0);
              if (currentTotalMenuUsage2Quantity + newProposedQuantity > numericGuests) {
                console.warn(`Usage 2 Menu (Sum Limit): Cannot increment ${addonData.name}. Total quantity ${currentTotalMenuUsage2Quantity + newProposedQuantity} would exceed guest count ${numericGuests}.`);
                return prev;
              }
            }

            // Rule 2: maxMenuTypes constraint (only if adding a new distinct menu type)
            if (oldQuantity === 0 && newProposedQuantity > 0) { // This means we are selecting a new distinct menu type
                const maxMenuTypesAllowed = selectedShiftTime?.maxMenuTypes;
                if (maxMenuTypesAllowed > 0) {
                    const distinctSelectedMenuTypesCount = new Set(prev.menus.filter(m => m.quantity > 0).map(m => m.uid)).size;
                    if (distinctSelectedMenuTypesCount >= maxMenuTypesAllowed) {
                        console.warn(`Usage 2 Menu (Max Types): Cannot select new menu type ${addonData.name}. Max ${maxMenuTypesAllowed} distinct menu types already selected.`);
                        return prev;
                    }
                }
            }
          }

          // Proceed with quantity update if not blocked by the constraints
          if (newProposedQuantity > 0) {
            if (menuIndex > -1) {
              newSelected.menus[menuIndex].quantity = newProposedQuantity;
              newSelected.menus[menuIndex].usagePolicy = menuUsagePolicy; // ensure policy stored
            } else {
              // This case (adding a new menu item under usage:2) should also respect the total quantity check above for its first unit.
              // The logic above handles it if numericGuests > 0.
              newSelected.menus.push({ ...addonData, quantity: newProposedQuantity, usagePolicy: menuUsagePolicy });
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
              newSelected.menus.push({ ...addonData, usagePolicy: menuUsagePolicy });
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

        let maxByParentQty = Infinity;
        if (addonData.parent !== -1) {
            const parentMenu = prev.menus.find(m => m.originalIndexInShift === addonData.parent);
            if (parentMenu) {
                // Determine parent menu's "effective" selected quantity for capping the option
                // If parentMenu is usage:2, its quantity is parentMenu.quantity
                // If parentMenu is usage:1 or usage:3, it's selected (effectively quantity 1 for this rule)
                maxByParentQty = (parentMenu.quantity !== undefined) ? parentMenu.quantity : 1;
            } else {
                maxByParentQty = 0; // Parent not selected, option quantity effectively capped at 0 by parent
            }
        }

        const effectiveMaxQty = Math.min(optionMaxQty, maxAllowedByGuestCount, maxByParentQty);

        if (quantity > 0 && quantity >= optionMinQty && quantity <= effectiveMaxQty) {
          newSelected.options[addonData.uid] = quantity;
        } else if (quantity <= 0 || quantity < optionMinQty) { // Also remove if below explicit min for option (or if parent made it 0)
             // If quantity becomes 0 due to parent cap (maxByParentQty=0), it should be deleted
            delete newSelected.options[addonData.uid];
        } else if (quantity > effectiveMaxQty) {
            // Quantity exceeds max allowed (could be due to option's own max, guest count, or parent quantity)
            // Clamp it to the calculated effectiveMaxQty.
            // If effectiveMaxQty is 0 (e.g. parent not selected), this means it will be deleted in the next condition.
            if (effectiveMaxQty > 0 && effectiveMaxQty >= optionMinQty) {
                 newSelected.options[addonData.uid] = effectiveMaxQty;
                 console.warn(`Quantity for option ${addonData.name} clamped to ${effectiveMaxQty}.`);
            } else { // effectiveMaxQty is less than optionMinQty (or 0), so delete
                 delete newSelected.options[addonData.uid];
                 console.warn(`Option ${addonData.name} removed as its quantity constraints could not be met (max: ${effectiveMaxQty}, min: ${optionMinQty}).`);
            }
        }
      }
      console.log("Updated selectedAddons:", newSelected);
      return newSelected;
    });
  };

  // --- Handler for area change ---
  const handleAreaChange = (areaUidOrAny) => {
    setSelectedArea(areaUidOrAny);
    
    // Update the selected area name for display in the summary
    if (areaUidOrAny === 'any') {
      setSelectedAreaName('Any Area');
    } else {
      const selectedAreaObj = availableAreas.find(area => area.uid === areaUidOrAny);
      setSelectedAreaName(selectedAreaObj ? selectedAreaObj.name : null);
    }
  };

  const handleProceedToBooking = async () => {
    if (!selectedDate || !guests || !selectedShiftTime || !selectedShiftTime.selectedTime) {
      alert(appConfig?.lng?.fillAllFields || "Please select date, guests, and a time before proceeding.");
      return;
    }

    const numericGuests = parseInt(guests, 10);
    const formattedDate = format(selectedDate, 'yyyy-MM-dd');
    const formattedTime = selectedShiftTime.selectedTime; // This is already in decimal format like 12.25

    /* ------------------------------------------------------------------
       Build optionsMeta so optional-addon UIDs map to friendly names.
       This allows formatAddonsForDisplay to show names instead of raw
       UIDs (e.g. "1003") in the booking summary.
    ------------------------------------------------------------------ */
    const optionsMeta = {};
    currentShiftAddons
      .filter((a) => a.type === 'Option')
      .forEach((opt) => {
        if (opt.uid && opt.name) {
          optionsMeta[String(opt.uid)] = { name: opt.name };
        }
      });

    // Attach meta without mutating original state object
    const selectedAddonsWithMeta = {
      ...selectedAddons,
      optionsMeta
    };

    // Split addon formatting: UID string for API vs. friendly string for UI
    const formattedAddonsUid     = formatSelectedAddonsForApi(
      selectedAddonsWithMeta,
      numericGuests,
      false
    );
    const formattedAddonsDisplay = formatAddonsForDisplay(
      selectedAddonsWithMeta,
      numericGuests
    );
    const formattedArea = formatAreaForApi(selectedArea);

    const bookingDataForHold = {
      est: est, // From URL params
      lng: appConfig?.usrLang || 'en', // From appConfig
      covers: numericGuests,
      date: formattedDate,
      time: formattedTime,
      // UID/quantity string required by Eveve API
      addons: formattedAddonsUid, // May be an empty string if no addons selected
      area: formattedArea,     // Formatted area ('' if none, 'any', or specific UID)
    };

    // Store booking data for display in the modal
    setBookingData({
      ...bookingDataForHold,
      formattedDate,
      areaName: selectedAreaName,
      // Friendly names for UI
      formattedAddons: formattedAddonsDisplay ? formattedAddonsDisplay : 'None'
    });

    try {
      setBookingState(prev => ({ ...prev, isHolding: true, holdError: null }));
      const holdResult = await holdBooking(bookingDataForHold);
      console.log("Hold Result:", holdResult);
      
      // Open booking details modal after successful hold
      setIsBookingModalOpen(true);
    } catch (err) {
      console.error("Error during hold:", err);
      setBookingState(prev => ({ ...prev, holdError: err.message }));
      alert(appConfig?.lng?.errorHold || "Failed to hold booking. Please try again.");
    } finally {
      setBookingState(prev => ({ ...prev, isHolding: false }));
    }
  };

  const handleCustomerDetailsSubmit = async (holdToken, customerData) => {
    try {
      setBookingState(prev => ({ ...prev, isUpdating: true, updateError: null }));
      
      /* ------------------------------------------------------------------
         Build a richer customer-data payload for /web/update
         • est  – restaurant UID from the URL
         • lng  – language code from remote config
         • addons – formatted addon string (uid[:qty],…)
         ------------------------------------------------------------------ */
      const enhancedCustomerData = {
        ...customerData,
        est,                                                    // Restaurant id (mandatory for Eveve)
        lng: appConfig?.usrLang || "en",                        // Language (falls back to en)
        addons: formatSelectedAddonsForApi(selectedAddons, parseInt(guests, 10)) || ""// Add-ons (empty string if none)
      };

      // Step 1: Update the hold with customer details + extras
      const updateResult = await updateHold(holdToken, enhancedCustomerData);
      console.log("Update Result:", updateResult);

      // /web/update is the final confirmation call — mark success immediately
      setBookingState(prev => ({ ...prev, bookingSuccess: true }));
    } catch (err) {
      console.error("Error during booking process:", err);
      setBookingState(prev => ({ 
        ...prev, 
        updateError: prev.isUpdating ? err.message : null
      }));
    } finally {
      setBookingState(prev => ({ ...prev, isUpdating: false }));
    }
  };

  const handleBookingModalClose = () => {
    // If booking was successful, we might want to reset the form
    if (bookingState.bookingSuccess) {
      // Reset form state for a new booking
      setSelectedDate(new Date());
      setGuests('');
      setSelectedDateForSummary(null);
      setSelectedGuestsForSummary(null);
      setShowDateTimePicker(true);
      setAvailabilityData(null);
      setApiError(null);
      setExpandedShiftIdentifier(null);
      setSelectedShiftTime(null);
      setSelectedAddons({ menus: [], options: {} });
      setCurrentShiftAddons([]);
      setCurrentShiftUsagePolicy(null);
      setAvailableAreas([]);
      setSelectedArea(null);
      setSelectedAreaName(null);
    }
    
    // Reset booking state
    setIsBookingModalOpen(false);
    setBookingState({
      isHolding: false,
      holdError: null,
      isUpdating: false,
      updateError: null,
      isBooking: false,
      bookingError: null,
      bookingSuccess: false
    });
  };

  const areAddonsValidForProceeding = () => {
    if (!selectedShiftTime || !currentShiftAddons || currentShiftAddons.length === 0) {
      // If no shift/time is selected, or no addons defined for it, then addon validation is trivially true.
      // The button's primary disabled state for "no time selected" will be handled separately.
      return { isValid: true };
    }

    const numericGuestCount = parseInt(guests, 10) || 0;

    // Filter currentShiftAddons by guest count to get addons actually available to the user
    const filterByGuestCount = (addon) => {
      if (numericGuestCount === 0 && addon.type === "Menu" && currentShiftUsagePolicy === 2) return true; // Allow quantity selection for menus if guest count is 0
      if (numericGuestCount === 0 && addon.type === "Option") return true; // Allow quantity selection for options if guest count is 0

      // For menus under policy 2, if guest count is 0, min/max on addon are for visibility if item itself is fixed, not per guest.
      // Let's assume for other cases, if guest count is 0, addons are generally not applicable unless explicitly stated.
      // However, the original AddonSelection shows all if guest count is 0. Let's refine.
      if (numericGuestCount === 0) return true; // Consistent with AddonSelection's initial filtering

      const minGuests = (typeof addon.min === 'number' && !isNaN(addon.min)) ? addon.min : 1;
      const maxGuests = (typeof addon.max === 'number' && !isNaN(addon.max)) ? addon.max : Infinity;
      return numericGuestCount >= minGuests && numericGuestCount <= maxGuests;
    };

    const effectiveMenuAddons = currentShiftAddons.filter(addon => addon.type === "Menu" && filterByGuestCount(addon));
    // Options are more complex due to parent linking, but their own min/max for quantity is checked later.
    // Parent linking check: ensure selected options have their parent menu selected.
    for (const optionUid in selectedAddons.options) {
        if (selectedAddons.options[optionUid] > 0) {
            const optionDetails = currentShiftAddons.find(a => String(a.uid) === optionUid);
            if (optionDetails && optionDetails.parent !== -1) {
                const parentMenuSelected = selectedAddons.menus.some(menu => menu.originalIndexInShift === optionDetails.parent);
                if (!parentMenuSelected) {
                    console.log(`Validation Fail: Option ${optionDetails.name} selected but parent menu is not.`);
                    return { isValid: false, reasonCode: 'OPTION_PARENT_MISSING' };
                }
            }
        }
    }


    // Menu Validation
    if (currentShiftUsagePolicy === 1) { // Radio Menu
      if (effectiveMenuAddons.length > 0 && selectedAddons.menus.length !== 1) {
        console.log("Validation Fail: Policy 1 - A menu must be selected.");
        return { isValid: false, reasonCode: 'SELECT_MENU_POLICY_1' };
      }
    } else if (currentShiftUsagePolicy === 2) { // Quantity Menu
      if (effectiveMenuAddons.length > 0 && numericGuestCount > 0) {
        const totalMenuQuantity = selectedAddons.menus.reduce((sum, menu) => sum + (menu.quantity || 0), 0);
        if (totalMenuQuantity !== numericGuestCount) {
          console.log(`Validation Fail: Policy 2 - Total menu quantity (${totalMenuQuantity}) must equal guest count (${numericGuestCount}).`);
          return { isValid: false, reasonCode: 'TOTAL_MENU_QUANTITY_MISMATCH' };
        }
        if (selectedShiftTime?.maxMenuTypes > 0) {
          const distinctSelectedMenuTypes = new Set(selectedAddons.menus.filter(m => m.quantity > 0).map(m => m.uid)).size;
          if (distinctSelectedMenuTypes > selectedShiftTime.maxMenuTypes) {
            console.log(`Validation Fail: Policy 2 - Exceeded max menu types (${selectedShiftTime.maxMenuTypes}).`);
            return { isValid: false, reasonCode: 'MAX_MENU_TYPES_EXCEEDED' };
          }
        }
      } else if (effectiveMenuAddons.length > 0 && numericGuestCount === 0) {
        const totalMenuQuantity = selectedAddons.menus.reduce((sum, menu) => sum + (menu.quantity || 0), 0);
        if (totalMenuQuantity === 0) {
            console.log("Validation Fail: Policy 2 (0 guests) - At least one menu item must be selected if available.");
            return { isValid: false, reasonCode: 'SELECT_MENU_POLICY_2_GUESTS_0' };
        }
      }
    } else if (currentShiftUsagePolicy === 3) { // Checkbox Menu
      if (effectiveMenuAddons.length > 0) {
        const selectedMenuCount = selectedAddons.menus.length;
        // Assuming if policy 3 and menus are available, at least one must be selected if minMenuTypes/maxMenuTypes implies a selection is needed.
        // Or if shift itself has a property like 'minRequiredMenusPolicy3'
        // For now, let's assume a general "must select at least one if available and policy 3 implies selection"
        // A more robust check might involve selectedShiftTime?.minMenuTypes for policy 3.
        // If no specific min, but menus are there, it's often implied one should be picked.
        // This is a bit ambiguous without explicit minRequired for policy 3.
        // Let's assume for now: if effectiveMenuAddons exist, and it's policy 3, at least one must be chosen.
        if (selectedMenuCount === 0) { // This could be refined with a specific config for min selections on policy 3.
          console.log("Validation Fail: Policy 3 - At least one menu selection might be required.");
          return { isValid: false, reasonCode: 'SELECT_MENU_POLICY_3' };
        }
        const maxSelections = selectedShiftTime?.maxMenuTypes > 0 ? selectedShiftTime.maxMenuTypes : (numericGuestCount > 0 ? numericGuestCount : (effectiveMenuAddons.length > 0 ? 1: 0));
         if (maxSelections > 0 && selectedMenuCount > maxSelections) {
            console.log(`Validation Fail: Policy 3 - Selected menu count (${selectedMenuCount}) exceeds maximum allowed (${maxSelections}).`);
            return { isValid: false, reasonCode: 'MAX_MENU_TYPES_EXCEEDED_POLICY_3' };
        }
      }
    }
    // Usage Policy 0 needs no specific menu validation here for proceeding.

    // Option Validation
    for (const optionUid in selectedAddons.options) {
      const quantity = selectedAddons.options[optionUid];
      if (quantity > 0) {
        const optionDetails = currentShiftAddons.find(a => String(a.uid) === optionUid);
        if (optionDetails) {
          const optionMinQty = (typeof optionDetails.min === 'number' && !isNaN(optionDetails.min)) ? optionDetails.min : 0;
          // Note: optionMinQty = 0 means it's truly optional. If min > 0, it means if selected, must have at least that quantity.
          // The current logic in handleAddonChange already tries to prevent quantity < optionMinQty if optionMinQty > 0.
          // This is a final check.
          if (quantity < optionMinQty && optionMinQty > 0) { // Only fail if explicit min > 0 is not met
            console.log(`Validation Fail: Option ${optionDetails.name} quantity (${quantity}) is less than min required (${optionMinQty}).`);
            return { isValid: false, reasonCode: 'OPTION_MIN_QUANTITY_NOT_MET' };
          }
        }
      }
    }
    console.log("Addon validation passed.");
    return { isValid: true };
  };

  // Effect to update proceedButtonState based on selections and addon validity
  useEffect(() => {
    if (!selectedShiftTime?.selectedTime) {
      setProceedButtonState({
        text: appConfig?.lng?.selectTimePrompt || "Select a Time to Proceed",
        disabled: true,
      });
      return;
    }

    const addonValidationResult = areAddonsValidForProceeding();

    // --- Area validation (if required) ---
    /* ----------------------------------------------------------
       Area requirement logic
       - arSelect === 'true'  ? area-selection feature enabled
       - areaAny  === 'true'  ? "Any Area" allowed ? optional
       - Otherwise            ? mandatory (must pick a specific area)
    ---------------------------------------------------------- */
    // DEBUG: inspect the raw flag values coming from appConfig
    /* eslint-disable no-console */
    console.log(
      "[AreaValidation] appConfig.arSelect →",
      appConfig?.arSelect,
      `(type: ${typeof appConfig?.arSelect})`
    );
    console.log(
      "[AreaValidation] appConfig.areaAny  →",
      appConfig?.areaAny,
      `(type: ${typeof appConfig?.areaAny})`
    );
    /* eslint-enable no-console */

    // ------------------------------------------------------------------
    // Area-selection validation
    // ‑ Eveve sometimes supplies feature flags as **booleans** and other
    //   times as the **strings** "true" / "false".  Normalise first.
    // ------------------------------------------------------------------
    const areaSelectEnabled =
      appConfig?.arSelect === true || appConfig?.arSelect === 'true';

    // Area is mandatory when the feature is enabled AND "Any Area" is not
    // allowed AND at least one concrete area is available for the time.
    const areaRequired =
      areaSelectEnabled && !areaAnyAllowed && availableAreas.length > 0;

    /* eslint-disable no-console */
    console.log('[AreaValidation] computed flags:', {
      areaSelectEnabled,
      areaAnyAllowed,
      areaRequired,
      selectedArea: selectedArea || 'none',
    });
    /* eslint-enable no-console */

    if (areaRequired && !selectedArea) {
      setProceedButtonState({
        text: appConfig?.lng?.selectAreaPrompt || "Please select a seating area",
        disabled: true,
      });
      return;
    }

    if (addonValidationResult.isValid) {
      setProceedButtonState({
        text: appConfig?.lng?.proceedToBookingBtn || "Proceed to Booking",
        disabled: false,
      });
    } else {
      let message = appConfig?.lng?.completeRequiredOptions || "Please complete required options"; // Generic fallback
      switch (addonValidationResult.reasonCode) {
        case 'SELECT_MENU_POLICY_1':
          message = appConfig?.lng?.selectMenuPolicy1Prompt || "Please select a menu option";
          break;
        case 'TOTAL_MENU_QUANTITY_MISMATCH':
          message = appConfig?.lng?.totalMenuQuantityMismatchPrompt || `Total menu items must match guest count (${guests})`;
          break;
        case 'MAX_MENU_TYPES_EXCEEDED':
          message = appConfig?.lng?.maxMenuTypesExceededPrompt || `You have selected too many menu types (max: ${selectedShiftTime?.maxMenuTypes || 'N/A'})`;
          break;
        case 'SELECT_MENU_POLICY_2_GUESTS_0':
          message = appConfig?.lng?.selectMenuPolicy2Guests0Prompt || "Please select at least one menu item";
          break;
        case 'SELECT_MENU_POLICY_3':
          message = appConfig?.lng?.selectMenuPolicy3Prompt || "Please make a menu selection";
          break;
        case 'MAX_MENU_TYPES_EXCEEDED_POLICY_3':
          message = appConfig?.lng?.maxMenuTypesExceededPolicy3Prompt || `Too many menu items selected (max: ${selectedShiftTime?.maxMenuTypes || guests})`;
          break;
        case 'OPTION_PARENT_MISSING':
          message = appConfig?.lng?.optionParentMissingPrompt || "Select the main course for your chosen side/option";
          break;
        case 'OPTION_MIN_QUANTITY_NOT_MET':
          message = appConfig?.lng?.optionMinQuantityNotMetPrompt || "Adjust quantity for a selected option";
          break;
        // Add more cases as new reasonCodes are introduced
      }
      setProceedButtonState({
        text: message,
        disabled: true,
      });
    }
  }, [selectedShiftTime, selectedAddons, guests, currentShiftAddons, appConfig, currentShiftUsagePolicy, availableAreas, selectedArea]); // Ensure all relevant dependencies


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
      <h1 className="text-2xl font-bold text-center text-gray-800">
        {appConfig?.lng?.makeBookingAtTitlePrefix || "Make a Booking at "}{appConfig.estFull}
      </h1>

      {showDateTimePicker && (
        <div className="flex flex-col items-center gap-6">
          {/* Calendar – full width */}
          <div className="flex justify-center w-full">
            {/* Added wrapper to give calendar consistent styling */}
            <div className="mt-6 p-4 rounded-lg shadow bg-white border border-gray-200">
              <ReactCalendarPicker
                /* When selectedDate is null (initial load) show today in the
                   calendar control but keep our controlled value unset so the
                   GuestSelector remains hidden until user selection. */
                date={selectedDate ?? new Date()}
                onChange={handleDateChange}
                dateFormat={appConfig?.dateFormat} // Pass dateFormat from config
                disablePast={true} // Pass disablePast from config
                disabledDates={disabledDates}
                onMonthChange={handleMonthChange}
              />
            </div>
          </div>

          {/* Guest selector – appears below calendar after date is chosen */}
          {selectedDate && (
            <div className="flex justify-center w-full">
              {/* Wrapper added for consistent styling with calendar */}
              <div className="mt-6 p-4 rounded-lg shadow bg-white border border-gray-200 text-center">
                <GuestSelector
                  value={guests}
                  onChange={handleGuestsChange}
                  minGuests={appConfig?.partyMin || 1}
                  maxGuests={appConfig?.partyMax || 10}
                  guestLabel={appConfig?.lng?.guest}
                  guestsLabel={appConfig?.lng?.guests || appConfig?.lng?.partySize}
                />
              </div>
            </div>
          )}
        </div>
      )}

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
          {/* This div will only render if date/covers are selected and pickers are hidden */}
          {!showDateTimePicker && (
            <div
              className={`p-4 bg-gray-50 rounded-lg shadow cursor-pointer hover:bg-gray-100`}
              onClick={() => setShowDateTimePicker(true)}
            >
              {/* This inner part now only needs to render the summary view */}
              <div className="text-gray-700 text-center">
                <h3 className="text-lg font-semibold">
                  {selectedDateForSummary ? format(selectedDateForSummary, 'EEEE do MMMM') : 'Date not set'}
                  {selectedGuestsForSummary ? ` for ${selectedGuestsForSummary} Guest${selectedGuestsForSummary > 1 ? 's' : ''}` : ''}
                </h3>
                <p className="text-xs text-gray-500 mt-1">Click to change</p>
              </div>
              {/* The availabilityData.message can still be relevant here */}
              {availabilityData.message && (
                <p className="text-sm p-3 bg-yellow-100 border border-yellow-300 text-yellow-800 rounded-md mt-2">
                  {availabilityData.message}
                </p>
              )}
            </div>
          )}

          {availabilityData.shifts && availabilityData.shifts.length > 0 ? (
            <div className="space-y-4">
              <h4 className="text-xl font-semibold text-gray-700">{appConfig?.lng?.availableShiftsTitle || "Available Shifts:"}</h4>
              {availabilityData.shifts.map((shift, index) => {
                const currentShiftIdentifier = shift.uid || index;
                const isExpanded = expandedShiftIdentifier === currentShiftIdentifier;
                // Determine if the currently selected time belongs to this shift
                const isSelectedShift = selectedShiftTime && (selectedShiftTime.uid ? selectedShiftTime.uid === shift.uid : selectedShiftTime.originalIndexInAvailabilityData === index);


                return (
                  <div key={currentShiftIdentifier} className="border border-gray-200 rounded-lg shadow-sm bg-white overflow-hidden">
                    <button
                      type="button"
                      className="w-full p-4 text-left bg-gray-50 hover:bg-gray-100 focus:outline-none"
                      onClick={() => {
                        const newIdentifier = isExpanded ? null : currentShiftIdentifier;
                        setExpandedShiftIdentifier(newIdentifier);
                        // If collapsing a shift that had a time selected, clear selectedShiftTime and addons
                        if (isExpanded && isSelectedShift) {
                          setSelectedShiftTime(null);
                          setSelectedAddons({ menus: [], options: {} });
                          setCurrentShiftAddons([]);
                          setCurrentShiftUsagePolicy(null);
                          setAvailableAreas([]);
                          setSelectedArea(null);
                          setSelectedAreaName(null);
                        }
                      }}
                    >
                      <div className="flex justify-between items-center">
                        <h5 className="text-lg font-bold text-blue-600">{shift.name}
                          <span className="text-sm font-normal text-gray-500 ml-2">({shift.type})</span>
                        </h5>
                        <span className={`transform transition-transform duration-200 ${isExpanded ? 'rotate-180' : 'rotate-0'}`}>
                          <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                        </span>
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="p-4 border-t border-gray-200">
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
                            <p className="text-sm font-semibold text-gray-800 mb-2">{appConfig?.lng?.availableBookingTimesTitle || "Available Booking Times:"}</p>
                            <div className="flex flex-wrap gap-2">
                              {/* Filter out negative times (blocked times) */}
                                {shift.times
                                  .filter(timeObj => {
                                    // Extract the time value, whether it's a direct decimal or an object with a time property
                                    const timeValue = typeof timeObj === 'object' ? timeObj.time : timeObj;
                                    // Only include positive time values (available times)
                                    return timeValue >= 0;
                                  })
                                  .map((timeObj, timeIndex) => (
                                <button
                                  key={timeIndex}
                                  onClick={() => handleTimeSelection(shift, timeObj, index)} // Pass originalIndexInAvailabilityData
                                  className={`px-3 py-1.5 text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50 transition-colors
                                    ${isSelectedShift && selectedShiftTime.selectedTime === (typeof timeObj === 'object' ? timeObj.time : timeObj)
                                      ? 'bg-green-600 text-white ring-green-600' // Active selected time
                                      : 'bg-green-500 text-white hover:bg-green-600 focus:ring-green-500' // Default
                                    }`}
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

                        {/* Area Selection - show only if this shift is selected and areas are available */}
                        {isSelectedShift && availableAreas && availableAreas.length > 0 && (
                          <div className="mt-4">
                            <AreaSelection
                              availableAreas={availableAreas}
                              selectedArea={selectedArea}
                              onAreaChange={handleAreaChange}
                              areaAnyEnabled={areaAnyAllowed}
                              languageStrings={appConfig?.lng}
                            />
                          </div>
                        )}

                        {/* AddonSelection - show only if this shift is selected and has addons */}
                        {isSelectedShift && currentShiftAddons && currentShiftAddons.length > 0 && (
                          <div className="mt-4"> {/* Added margin-top for spacing */}
                            <AddonSelection
                              currentShiftAddons={currentShiftAddons}
                              currentShiftUsagePolicy={currentShiftUsagePolicy}
                              selectedAddons={selectedAddons}
                              onAddonChange={handleAddonSelectionChange}
                              guestCount={guests}
                              currencySymbol={EFFECTIVE_CURRENCY_SYMBOL}
                              languageStrings={appConfig?.lng}
                              selectedShiftTime={selectedShiftTime}
                            />
                          </div>
                        )}

                        {/* SelectedAddonsSummary - show if this shift is selected and addons are selected */}
                        {isSelectedShift && (Object.keys(selectedAddons.options).length > 0 || selectedAddons.menus.length > 0) && (
                           <div className="mt-4"> {/* Added margin-top for spacing */}
                            <SelectedAddonsSummary
                              selectedAddons={selectedAddons}
                              currencySymbol={EFFECTIVE_CURRENCY_SYMBOL}
                              languageStrings={appConfig?.lng}
                              guestCount={guests}
                              currentShiftAddons={currentShiftAddons}
                            />
                          </div>
                        )}

                        {/* "Proceed to Booking" button - shown if this shift is selected */}
                        {isSelectedShift && selectedShiftTime?.selectedTime && (
                          <div className="mt-6 text-center"> {/* Adjusted margin-top */}
                            <button
                              onClick={handleProceedToBooking}
                              disabled={proceedButtonState.disabled}
                              className="px-6 py-3 bg-purple-600 text-white text-lg font-semibold rounded-lg shadow-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-75 transition-all duration-150 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed flex flex-col items-center justify-center"
                            >
                              <span>{proceedButtonState.text}</span>
                              {selectedShiftTime?.selectedTime && selectedDate && guests && ( // Summary still shown if time selected
                                <div className="text-xs font-normal mt-1 text-purple-200">
                                  {selectedShiftTime.name} - {format(selectedDate, appConfig?.dateFormat || 'MMM d, yyyy')} - {guests} Guest{guests > 1 ? 's' : ''} - {formatDecimalTime(selectedShiftTime.selectedTime, appConfig?.timeFormat)}
                                  {selectedAreaName && ` - ${selectedAreaName}`}
                                </div>
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
             (!availabilityData.message && !apiError) &&
            <p className="text-center text-gray-600 py-4 text-lg">
              {appConfig?.lng?.legendClosed || 'No shifts currently available for the selected criteria.'}
            </p>
          )}
        </div>
      )}
      {/* Fallback for when availabilityData itself is null but not loading and no error, or other states */}
      { !availabilityData && !isLoading && !apiError && guests && selectedDate && (
        <div className="text-center text-gray-500 py-4">
             {appConfig?.lng?.noAvailDate || "No availability information for the selected date/guests. Please try different criteria."}
        </div>
      )}

      {/* Booking Details Modal */}
      <BookingDetailsModal
        isOpen={isBookingModalOpen}
        onClose={handleBookingModalClose}
        holdData={holdData}
        bookingData={bookingData}
        onSubmit={handleCustomerDetailsSubmit}
        appConfig={appConfig}
        isLoading={bookingState.isUpdating || bookingState.isBooking}
        error={bookingState.updateError || bookingState.bookingError}
        success={bookingState.bookingSuccess}
      />
    </div>
  );
}
