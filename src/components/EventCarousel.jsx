// src/components/EventCarousel.jsx
import React, { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { generateDateRange, excelSerialToDate } from '../utils/dateConversion';
import { formatDecimalTime } from '../utils/time';
import { 
  fetchEventMonthAvailability, 
  parseEventAvailableDates, 
  calculateEventMidpointTime 
} from '../utils/eventMonthAvailability';

/**
 * EventCarousel Component
 * Displays a horizontal scrolling carousel of event cards.
 * Each event shows its name, description, available dates, time range, and guest range.
 * 
 * @param {Object} props
 * @param {Array} props.events - Array of event objects from eventsB config
 * @param {Function} props.onDateSelect - Callback when a date is clicked (date, event)
 * @param {Function} props.onAvailabilityUpdate - Callback when event availability is fetched (eventUid, availableDates)
 * @param {boolean} props.isExpanded - Controls whether carousel is expanded (external control)
 * @param {Function} props.onExpandedChange - Callback when expansion state should change
 * @param {Object} props.languageStrings - Language strings from appConfig.lng
 * @param {string} props.timeFormat - Time format preference
 * @param {string} props.dateFormat - Date format preference
 * @param {string} props.est - Restaurant UID for API calls
 * @param {string} props.baseApiUrl - Base API URL for month-avail calls
 * @param {Date} props.currentMonth - Current month being viewed for availability
 */
export default function EventCarousel({ 
  events = [], 
  onDateSelect, 
  onAvailabilityUpdate,
  isExpanded = true,
  onExpandedChange,
  languageStrings = {},
  timeFormat = 'h:mm a',
  dateFormat = 'MMM d, yyyy',
  est,
  baseApiUrl,
  currentMonth = new Date(),
  guestCount = 0
}) {
  // Use external isExpanded control if onExpandedChange is provided, otherwise use internal state
  const [internalExpanded, setInternalExpanded] = useState(true);
  const effectiveExpanded = onExpandedChange ? isExpanded : internalExpanded;
  
  // Carousel navigation state
  const [activeEventIndex, setActiveEventIndex] = useState(0);
  const carouselRef = React.useRef(null);
  
  const handleToggleExpanded = () => {
    if (onExpandedChange) {
      onExpandedChange(!isExpanded);
    } else {
      setInternalExpanded(!internalExpanded);
    }
  };

  // Carousel navigation functions
  const scrollToEvent = (index) => {
    if (carouselRef.current) {
      const eventCards = carouselRef.current.children;
      if (eventCards[index]) {
        eventCards[index].scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'center'
        });
        setActiveEventIndex(index);
      }
    }
  };

  // Filter events to only show those with showCal: true
  const visibleEvents = useMemo(() => {
    return events.filter(event => event.showCal === true);
  }, [events]);

  // Process events to include date arrays and sort by first available date (newest first)
  const processedEvents = useMemo(() => {
    const processedEventsWithDates = visibleEvents.map(event => {
      const dates = generateDateRange(event.from, event.to);
      return {
        ...event,
        dates,
        dateCount: dates.length
      };
    });

    // Sort by first available date (event.from) with newest (closest to today) first
    const sortedEvents = processedEventsWithDates.sort((a, b) => {
      // Convert Excel epoch days to JavaScript dates for comparison
      const dateA = new Date(1900, 0, a.from);
      const dateB = new Date(1900, 0, b.from);
      
      // Sort ascending (earliest dates first) - upcoming events appear first
      return dateA.getTime() - dateB.getTime();
    });

    // Debug logging to verify sorting
    console.log('📅 Events sorted by date:', sortedEvents.map(event => ({
      name: event.name,
      from: event.from,
      convertedDate: new Date(1900, 0, event.from).toDateString()
    })));

    return sortedEvents;
  }, [visibleEvents]);

  // Update active index based on scroll position (after processedEvents is defined)
  React.useEffect(() => {
    const handleScroll = () => {
      if (!carouselRef.current) return;
      
      const container = carouselRef.current.parentElement;
      const containerRect = container.getBoundingClientRect();
      const containerCenter = containerRect.left + containerRect.width / 2;
      
      let closestIndex = 0;
      let minDistance = Infinity;
      
      Array.from(carouselRef.current.children).forEach((child, index) => {
        const childRect = child.getBoundingClientRect();
        const childCenter = childRect.left + childRect.width / 2;
        const distance = Math.abs(childCenter - containerCenter);
        
        if (distance < minDistance) {
          minDistance = distance;
          closestIndex = index;
        }
      });
      
      setActiveEventIndex(closestIndex);
    };

    const scrollContainer = carouselRef.current?.parentElement;
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', handleScroll);
      return () => scrollContainer.removeEventListener('scroll', handleScroll);
    }
  }, [processedEvents.length]);

  if (processedEvents.length === 0) {
    return null; // Don't render anything if no events to show
  }

  const handleDateClick = (date, event) => {
    if (onDateSelect) {
      onDateSelect(date, event);
    }
  };

  return (
    <div className="mb-6 border border-primary/30 rounded-lg shadow-sm bg-base-100 overflow-hidden">
      {/* Header - Collapsible */}
      <button
        type="button"
        className="w-full p-4 flex justify-between items-center bg-primary/10 hover:bg-primary/20 focus:outline-none transition-colors"
        onClick={handleToggleExpanded}
      >
        <div className="flex items-center gap-2">
          <svg 
            className="w-6 h-6 text-primary" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth="2" 
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <h3 className="text-lg font-bold text-primary">
            {languageStrings.upcomingEvents || 'Upcoming Special Events'}
          </h3>
          <span className="ml-2 px-2 py-0.5 text-xs font-semibold bg-primary text-primary-content rounded-full">
            {processedEvents.length}
          </span>
        </div>
        <span className={`transform transition-transform duration-200 ${effectiveExpanded ? 'rotate-180' : 'rotate-0'}`}>
          <svg 
            className="w-5 h-5 text-primary" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
        </span>
      </button>

      {/* Carousel Content */}
      {effectiveExpanded && (
        <div className="p-4 bg-base-100">
          <div className="overflow-x-auto pb-2">
            <div ref={carouselRef} className="flex gap-4 min-w-max">
              {processedEvents.map((event, index) => (
                <EventCard
                  key={event.uid || index}
                  event={event}
                  onDateClick={handleDateClick}
                  onAvailabilityUpdate={onAvailabilityUpdate}
                  languageStrings={languageStrings}
                  timeFormat={timeFormat}
                  dateFormat={dateFormat}
                  est={est}
                  baseApiUrl={baseApiUrl}
                  currentMonth={currentMonth}
                  guestCount={guestCount}
                />
              ))}
            </div>
          </div>
          
          {/* Carousel Indicators */}
          {processedEvents.length > 1 && (
            <div className="flex justify-center items-center gap-2 mt-4 mb-2">
              {processedEvents.map((_, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => scrollToEvent(index)}
                  className={`
                    w-2 h-2 rounded-full transition-all duration-300 hover:scale-125 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-1
                    ${index === activeEventIndex 
                      ? 'bg-primary w-6 h-2' 
                      : 'bg-base-300 hover:bg-primary/60'
                    }
                  `}
                  aria-label={`Go to event ${index + 1}: ${processedEvents[index].name}`}
                  title={`${processedEvents[index].name}`}
                />
              ))}
              <span className="ml-2 text-xs text-base-content/60 font-medium">
                {activeEventIndex + 1} / {processedEvents.length}
              </span>
            </div>
          )}
          
          <p className="text-xs text-base-content/60 mt-2 italic text-center">
            {languageStrings.eventCarouselHint || 'Click "Show Available Dates" to see actual availability, then click on a date to book this event'}
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * EventCard Component
 * Displays a single event card with all its details
 */
function EventCard({ event, onDateClick, onAvailabilityUpdate, languageStrings, timeFormat, dateFormat, est, baseApiUrl, currentMonth, guestCount }) {
  const [isDateListExpanded, setIsDateListExpanded] = useState(false);
  const [availabilityFetched, setAvailabilityFetched] = useState(false);
  const [isLoadingAvailability, setIsLoadingAvailability] = useState(false);
  const [availableDates, setAvailableDates] = useState([]);
  
  // Loading progress state
  const [searchProgress, setSearchProgress] = useState({
    isSearching: false,
    currentMonth: null,
    currentYear: null,
    eventName: null,
    attemptNumber: 0
  });
  
  // Track the currently viewed month for this event (for multi-month navigation)
  const [viewedMonth, setViewedMonth] = useState(null);
  const [viewedYear, setViewedYear] = useState(null);
  const [availabilityError, setAvailabilityError] = useState(null);

  // Check if debug mode is enabled via URL parameter
  const isDebugMode = useMemo(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      return urlParams.get('debug') === 'true';
    }
    return false;
  }, []);

  // Check if event spans multiple months
  const eventSpansMultipleMonths = useMemo(() => {
    if (!event.from || !event.to) return false;
    
    const startDate = excelSerialToDate(event.from);
    const endDate = excelSerialToDate(event.to);
    
    return (
      startDate.getFullYear() !== endDate.getFullYear() ||
      startDate.getMonth() !== endDate.getMonth()
    );
  }, [event.from, event.to]);
  const [isDescriptionPopupOpen, setIsDescriptionPopupOpen] = useState(false);

  // Function to strip HTML tags and get plain text length
  const getPlainTextLength = (htmlString) => {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlString;
    return tempDiv.textContent || tempDiv.innerText || '';
  };

  // Function to check if description needs truncation
  const needsTruncation = (desc) => {
    if (!desc) return false;
    const plainText = getPlainTextLength(desc);
    return plainText.length > 110;
  };

  // Function to truncate description
  const getTruncatedDescription = (desc) => {
    if (!desc) return '';
    const plainText = getPlainTextLength(desc);
    if (plainText.length <= 110) return desc;
    
    // Find a safe truncation point by looking for the last space within 110 chars
    const truncateAt = plainText.substring(0, 110).lastIndexOf(' ');
    const cutPoint = truncateAt > 0 ? truncateAt : 110;
    
    // For HTML descriptions, we need to be more careful to avoid breaking tags
    // For now, we'll use the plain text approach and let the user see full HTML in popup
    return plainText.substring(0, cutPoint) + '...';
  };

  // Function to fetch availability for a specific month (used by navigation buttons)
  const fetchAvailabilityForMonth = async (year, month) => {
    if (!est || !baseApiUrl) return;
    
    setIsLoadingAvailability(true);
    setAvailabilityError(null);
    
    try {
      const monthDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const numericGuests = parseInt(guestCount, 10) || 2; // Use actual guest count, fallback to 2
      
      console.log(`🗓️ Fetching availability for ${event.name} in ${year}-${String(month).padStart(2, '0')} with ${numericGuests} guests`);
      
      // Fetch month availability for this event using the specified month and guest count
      const monthAvailResponse = await fetchEventMonthAvailability(
        est, 
        event, 
        baseApiUrl, 
        monthDate,
        numericGuests
      );
      
      // Parse available dates from response using the target month
      const eventAvailableDates = parseEventAvailableDates(
        monthAvailResponse, 
        event.uid, 
        year, 
        month
      );
      
      setAvailableDates(eventAvailableDates);
      setViewedYear(year);
      setViewedMonth(month);
      setIsDateListExpanded(true); // Auto-expand to show results
      
      // Update calendar with actual available dates for this event
      // This will replace any previously shown event availability on the calendar
      if (onAvailabilityUpdate) {
        onAvailabilityUpdate(event.uid, eventAvailableDates);
      }
      
      console.log(`Fetched ${eventAvailableDates.length} available dates for event ${event.uid} in ${year}-${String(month).padStart(2, '0')}`);
      
    } catch (error) {
      console.error('Error fetching event availability:', error);
      setAvailabilityError(error.message);
    } finally {
      setIsLoadingAvailability(false);
    }
  };

  // Function to fetch actual availability for this event (initial load)
  const handleShowAvailableDates = async () => {
    if (!est || !baseApiUrl || availabilityFetched) return;
    
    // Check guest count validation before making API call
    const numericGuests = parseInt(guestCount, 10);
    if (numericGuests > 0 && event.min && event.max) {
      if (numericGuests < event.min || numericGuests > event.max) {
        // Guest count doesn't qualify for this event - show validation message
        const errorMessage = (languageStrings.eventGuestMismatch || 'You have selected {{guestCount}}, this event is for {{minGuests}} to {{maxGuests}}')
          .replace('{{guestCount}}', `${numericGuests} guest${numericGuests > 1 ? 's' : ''}`)
          .replace('{{minGuests}}', event.min.toString())
          .replace('{{maxGuests}}', event.max.toString());
        
        setAvailabilityError(errorMessage);
        setAvailabilityFetched(true);
        setAvailableDates([]);
        setViewedYear(null);
        setViewedMonth(null);
        
        console.log(`❌ Guest count validation failed for event ${event.name}: ${numericGuests} guests not in range ${event.min}-${event.max}`);
        return;
      }
    }
    
    setAvailabilityFetched(true);
    
    // Determine which month to start checking based on event start date
    let startYear, startMonth;
    
    if (event.from) {
      // Convert Excel serial number to JavaScript Date using our conversion function
      const eventStartDate = excelSerialToDate(event.from);
      const currentDate = new Date();
      
      // Check if event starts in current month
      const isCurrentMonth = (
        eventStartDate.getFullYear() === currentDate.getFullYear() &&
        eventStartDate.getMonth() === currentDate.getMonth()
      );
      
      if (isCurrentMonth) {
        // Event is in current month - start checking from current month
        startYear = currentDate.getFullYear();
        startMonth = currentDate.getMonth() + 1; // 1-based month
        console.log(`🗓️ Event ${event.name} is in current month, starting search from (${startYear}-${String(startMonth).padStart(2, '0')})`);
      } else {
        // Event is in future month - start checking from event's start month
        startYear = eventStartDate.getFullYear();
        startMonth = eventStartDate.getMonth() + 1; // 1-based month
        console.log(`🗓️ Event ${event.name} is in future month, starting search from (${startYear}-${String(startMonth).padStart(2, '0')})`);
      }
    } else {
      // Fallback to current month if no event start date
      startYear = currentMonth.getFullYear();
      startMonth = currentMonth.getMonth() + 1;
      console.log(`⚠️ Event ${event.name} has no start date, starting search from current month (${startYear}-${String(startMonth).padStart(2, '0')})`);
    }
    
    // Smart month progression: keep checking months until we find availability or reach event end
    await findAvailabilityInMonthRange(startYear, startMonth);
  };
  
  // Function to search for availability across multiple months if needed
  const findAvailabilityInMonthRange = async (startYear, startMonth) => {
    const eventEndDate = event.to ? excelSerialToDate(event.to) : null;
    const maxEndYear = eventEndDate ? eventEndDate.getFullYear() : startYear;
    const maxEndMonth = eventEndDate ? eventEndDate.getMonth() + 1 : startMonth; // 1-based month
    
    let currentSearchYear = startYear;
    let currentSearchMonth = startMonth;
    let foundAvailability = false;
    let attemptCount = 0;
    const maxAttempts = 12; // Safety limit to prevent infinite loops
    
    // Initialize search progress
    setSearchProgress({
      isSearching: true,
      currentMonth: currentSearchMonth,
      currentYear: currentSearchYear,
      eventName: event.name,
      attemptNumber: 0
    });
    
    console.log(`🔄 Search progress state set:`, {
      isSearching: true,
      currentMonth: currentSearchMonth,
      currentYear: currentSearchYear,
      eventName: event.name,
      attemptNumber: 0
    });
    
    console.log(`🔍 Smart search: Event ${event.name} runs from ${startYear}-${String(startMonth).padStart(2, '0')} to ${maxEndYear}-${String(maxEndMonth).padStart(2, '0')}`);
    
    while (!foundAvailability && attemptCount < maxAttempts) {
      attemptCount++;
      
      // Update search progress
      setSearchProgress({
        isSearching: true,
        currentMonth: currentSearchMonth,
        currentYear: currentSearchYear,
        eventName: event.name,
        attemptNumber: attemptCount
      });
      
      // Check if we've gone beyond the event end date
      if (eventEndDate) {
        const searchDate = new Date(currentSearchYear, currentSearchMonth - 1, 1);
        const endDate = new Date(maxEndYear, maxEndMonth - 1, 1);
        
        if (searchDate > endDate) {
          console.log(`🛑 Reached event end date (${maxEndYear}-${String(maxEndMonth).padStart(2, '0')}), stopping search`);
          break;
        }
      }
      
      console.log(`🔍 Checking availability for ${event.name} in ${currentSearchYear}-${String(currentSearchMonth).padStart(2, '0')} (attempt ${attemptCount})`);
      
      // Fetch availability for current month
      setIsLoadingAvailability(true);
      setAvailabilityError(null);
      
      try {
        const monthDate = `${currentSearchYear}-${String(currentSearchMonth).padStart(2, '0')}-01`;
        const numericGuests = parseInt(guestCount, 10) || 2; // Use actual guest count, fallback to 2
        
        const monthAvailResponse = await fetchEventMonthAvailability(
          est, 
          event, 
          baseApiUrl, 
          monthDate,
          numericGuests
        );
        
        const eventAvailableDates = parseEventAvailableDates(
          monthAvailResponse, 
          event.uid, 
          currentSearchYear, 
          currentSearchMonth
        );
        
        if (eventAvailableDates.length > 0) {
          // Found availability!
          foundAvailability = true;
          setAvailableDates(eventAvailableDates);
          setViewedYear(currentSearchYear);
          setViewedMonth(currentSearchMonth);
          setIsDateListExpanded(true);
          
          if (onAvailabilityUpdate) {
            onAvailabilityUpdate(event.uid, eventAvailableDates);
          }
          
          console.log(`✅ Found ${eventAvailableDates.length} available dates for event ${event.uid} in ${currentSearchYear}-${String(currentSearchMonth).padStart(2, '0')}`);
        } else {
          console.log(`❌ No availability found in ${currentSearchYear}-${String(currentSearchMonth).padStart(2, '0')}, checking next month`);
          
          // Move to next month
          currentSearchMonth++;
          if (currentSearchMonth > 12) {
            currentSearchMonth = 1;
            currentSearchYear++;
          }
        }
        
      } catch (error) {
        console.error(`💥 Error fetching availability for ${currentSearchYear}-${String(currentSearchMonth).padStart(2, '0')}:`, error);
        setAvailabilityError(error.message);
        break;
      }
    }
    
    // If we didn't find any availability after searching
    if (!foundAvailability) {
      setAvailableDates([]);
      setViewedYear(startYear);
      setViewedMonth(startMonth);
      
      if (onAvailabilityUpdate) {
        onAvailabilityUpdate(event.uid, []);
      }
      
      console.log(`⚠️ No availability found for event ${event.uid} after checking ${attemptCount} month(s)`);
    }
    
    // Clear search progress
    setSearchProgress({
      isSearching: false,
      currentMonth: null,
      currentYear: null,
      eventName: null,
      attemptNumber: 0
    });
    
    setIsLoadingAvailability(false);
  };

  // Month navigation functions
  const handlePreviousMonth = async () => {
    if (!viewedYear || !viewedMonth) return;
    
    let newMonth = viewedMonth - 1;
    let newYear = viewedYear;
    
    if (newMonth < 1) {
      newMonth = 12;
      newYear = newYear - 1;
    }
    
    await fetchAvailabilityForMonth(newYear, newMonth);
  };

  const handleNextMonth = async () => {
    if (!viewedYear || !viewedMonth) return;
    
    let newMonth = viewedMonth + 1;
    let newYear = viewedYear;
    
    if (newMonth > 12) {
      newMonth = 1;
      newYear = newYear + 1;
    }
    
    await fetchAvailabilityForMonth(newYear, newMonth);
  };

  // Helper functions for navigation visibility
  const canShowPreviousMonth = () => {
    if (!viewedYear || !viewedMonth || !event.from) return false;
    
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1; // 1-based
    
    const eventStartDate = new Date(1900, 0, event.from);
    const eventStartYear = eventStartDate.getFullYear();
    const eventStartMonth = eventStartDate.getMonth() + 1; // 1-based
    
    // Don't show previous if we're in current month OR event start month
    const isCurrentMonth = (viewedYear === currentYear && viewedMonth === currentMonth);
    const isEventStartMonth = (viewedYear === eventStartYear && viewedMonth === eventStartMonth);
    
    return !isCurrentMonth && !isEventStartMonth;
  };

  const canShowNextMonth = () => {
    if (!viewedYear || !viewedMonth || !event.to) return false;
    
    const eventEndDate = new Date(1900, 0, event.to);
    const eventEndYear = eventEndDate.getFullYear();
    const eventEndMonth = eventEndDate.getMonth() + 1; // 1-based
    
    // Don't show next if we're already at event end month
    return !(viewedYear === eventEndYear && viewedMonth === eventEndMonth);
  };

  return (
    <div className="flex-shrink-0 w-80 border border-base-300 rounded-lg shadow-md bg-base-100 overflow-hidden hover:shadow-lg transition-shadow">
      {/* Event Header */}
      <div className="bg-gradient-to-r from-primary/20 to-primary/10 p-4 border-b border-primary/30">
        <h4 className="text-lg font-bold text-primary mb-1">{event.name}</h4>
        <div className="flex items-center gap-4 text-sm text-base-content/70">
          <div className="flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{formatDecimalTime(event.early, timeFormat)} - {formatDecimalTime(event.late, timeFormat)}</span>
          </div>
          <div className="flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <span>{event.min} - {event.max} {languageStrings.guests || 'guests'}</span>
          </div>
        </div>
      </div>

      {/* Event Description */}
      {event.desc && (
        <div className="p-4 text-sm text-base-content prose prose-sm max-w-none border-b border-base-300">
          {needsTruncation(event.desc) ? (
            <div>
              <span>{getTruncatedDescription(event.desc)}</span>
              <button
                type="button"
                onClick={() => setIsDescriptionPopupOpen(true)}
                className="ml-1 text-primary hover:text-primary-focus underline cursor-pointer"
              >
                {languageStrings.readMore || 'read more'}
              </button>
            </div>
          ) : (
            <div dangerouslySetInnerHTML={{ __html: event.desc }} />
          )}
          
          {/* Date Conversion Confirmation Section (Debug Mode Only) */}
          {isDebugMode && (event.from || event.to) && (
            <div className="mt-3 p-2 bg-base-200 rounded text-xs text-base-content/70 border-l-2 border-primary/30">
              <strong className="text-primary">📅 Date Conversion Confirmation:</strong>
              <div className="mt-1 space-y-1">
                {event.from && (
                  <div>
                    <strong>Start:</strong> {event.from} → {excelSerialToDate(event.from).toLocaleDateString('en-GB')} ({excelSerialToDate(event.from).toDateString()})
                  </div>
                )}
                {event.to && (
                  <div>
                    <strong>End:</strong> {event.to} → {excelSerialToDate(event.to).toLocaleDateString('en-GB')} ({excelSerialToDate(event.to).toDateString()})
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Available Dates Section */}
      <div className="p-4 relative">
        {/* Loading Overlay for Search Progress */}
        {searchProgress.isSearching && (
          <div className="absolute inset-0 bg-base-100/90 backdrop-blur-sm flex flex-col items-center justify-center z-10 rounded">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary mb-3"></div>
            <div className="text-center">
              <div className="text-sm font-semibold text-primary mb-1">
                Looking for availability for {searchProgress.eventName}
              </div>
              <div className="text-xs text-base-content/60">
                in {new Date(searchProgress.currentYear, searchProgress.currentMonth - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                {searchProgress.attemptNumber > 1 && (
                  <span className="ml-1">(attempt {searchProgress.attemptNumber})</span>
                )}
              </div>
            </div>
          </div>
        )}
        
        {/* Debug overlay visibility */}
        {console.log('🖥️ Overlay render check:', { isSearching: searchProgress.isSearching, eventName: searchProgress.eventName })}
        
        {!availabilityFetched ? (
          /* Show Available Dates Button */
          <button
            type="button"
            className="w-full flex justify-center items-center gap-2 p-3 bg-primary text-primary-content rounded-md hover:bg-primary-focus transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handleShowAvailableDates}
            disabled={isLoadingAvailability || !est || !baseApiUrl}
          >
            {isLoadingAvailability ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-primary-content"></div>
                <span>{languageStrings.loadingAvailability || 'Loading availability...'}</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span>{languageStrings.showAvailableDates || 'Show Available Dates'}</span>
              </>
            )}
          </button>
        ) : (
          /* Show Fetched Available Dates */
          <>
            {/* Month Navigation Header (only show if event spans multiple months) */}
            {eventSpansMultipleMonths && viewedYear && viewedMonth && (
              <div className="flex items-center justify-between mb-2 bg-base-200 rounded p-2">
                <button
                  type="button"
                  onClick={handlePreviousMonth}
                  disabled={!canShowPreviousMonth() || isLoadingAvailability}
                  className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-base-content hover:text-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                  </svg>
                  Previous
                </button>
                
                <span className="text-sm font-semibold text-base-content">
                  {new Date(viewedYear, viewedMonth - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </span>
                
                <button
                  type="button"
                  onClick={handleNextMonth}
                  disabled={!canShowNextMonth() || isLoadingAvailability}
                  className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-base-content hover:text-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            )}

            <button
              type="button"
              className="w-full flex justify-between items-center mb-2 text-sm font-semibold text-base-content hover:text-primary transition-colors"
              onClick={() => setIsDateListExpanded(!isDateListExpanded)}
            >
              <span>
                {languageStrings.availableDates || 'Available Dates'} ({availableDates.length})
                {viewedYear && viewedMonth && !eventSpansMultipleMonths && (
                  <span className="ml-2 text-xs font-normal text-base-content/60">
                    ({new Date(viewedYear, viewedMonth - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })})
                  </span>
                )}
              </span>
              <svg 
                className={`w-4 h-4 transform transition-transform ${isDateListExpanded ? 'rotate-180' : 'rotate-0'}`}
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {availabilityError && (
              <div className="mb-2 p-2 text-xs text-error bg-error/10 border border-error rounded">
                {availabilityError}
              </div>
            )}

            {availableDates.length === 0 && !availabilityError && (
              <div className="mb-2 p-2 text-xs text-base-content/60 bg-base-200 rounded">
                {languageStrings.noAvailableDates || 'No available dates found for this event.'}
              </div>
            )}

            {/* Available Date Chips */}
            {availableDates.length > 0 && (
              <div className={`flex flex-wrap gap-2 ${isDateListExpanded ? '' : 'max-h-20 overflow-hidden'}`}>
                {availableDates.map((date, idx) => {
                  const isPast = date < new Date(new Date().setHours(0, 0, 0, 0));
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => !isPast && onDateClick(date, event)}
                      disabled={isPast}
                      className={`
                        px-3 py-1.5 text-xs font-medium rounded-md transition-all
                        ${isPast 
                          ? 'bg-base-300 text-base-content/40 cursor-not-allowed' 
                          : 'bg-success text-success-content hover:bg-success-focus hover:scale-105 cursor-pointer shadow-sm hover:shadow-md'
                        }
                      `}
                      title={isPast ? languageStrings.pastDate || 'Date has passed' : `${languageStrings.clickToBook || 'Click to book'}: ${format(date, dateFormat)}`}
                    >
                      {format(date, 'MMM d')}
                    </button>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* Description Popup Modal */}
      {isDescriptionPopupOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setIsDescriptionPopupOpen(false)}>
          <div className="bg-base-100 rounded-lg shadow-lg max-w-md w-full mx-4 max-h-[80vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="flex justify-between items-center p-4 border-b border-base-300">
              <h5 className="text-lg font-bold text-primary">{event.name}</h5>
              <button
                type="button"
                onClick={() => setIsDescriptionPopupOpen(false)}
                className="text-base-content/60 hover:text-base-content focus:outline-none"
                aria-label="Close description popup"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* Modal Content */}
            <div className="p-4 overflow-y-auto max-h-[60vh]">
              <div 
                className="text-sm text-base-content prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: event.desc }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}