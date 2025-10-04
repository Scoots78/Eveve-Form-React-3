// src/components/EventCarousel.jsx
import React, { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { generateDateRange } from '../utils/dateConversion';
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
  currentMonth = new Date()
}) {
  // Use external isExpanded control if onExpandedChange is provided, otherwise use internal state
  const [internalExpanded, setInternalExpanded] = useState(true);
  const effectiveExpanded = onExpandedChange ? isExpanded : internalExpanded;
  
  const handleToggleExpanded = () => {
    if (onExpandedChange) {
      onExpandedChange(!isExpanded);
    } else {
      setInternalExpanded(!internalExpanded);
    }
  };

  // Filter events to only show those with showCal: true
  const visibleEvents = useMemo(() => {
    return events.filter(event => event.showCal === true);
  }, [events]);

  // Process events to include date arrays
  const processedEvents = useMemo(() => {
    return visibleEvents.map(event => {
      const dates = generateDateRange(event.from, event.to);
      return {
        ...event,
        dates,
        dateCount: dates.length
      };
    });
  }, [visibleEvents]);

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
            <div className="flex gap-4 min-w-max">
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
                />
              ))}
            </div>
          </div>
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
function EventCard({ event, onDateClick, onAvailabilityUpdate, languageStrings, timeFormat, dateFormat, est, baseApiUrl, currentMonth }) {
  const [isDateListExpanded, setIsDateListExpanded] = useState(false);
  const [availabilityFetched, setAvailabilityFetched] = useState(false);
  const [isLoadingAvailability, setIsLoadingAvailability] = useState(false);
  const [availableDates, setAvailableDates] = useState([]);
  const [availabilityError, setAvailabilityError] = useState(null);
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
    return plainText.length > 60;
  };

  // Function to truncate description
  const getTruncatedDescription = (desc) => {
    if (!desc) return '';
    const plainText = getPlainTextLength(desc);
    if (plainText.length <= 60) return desc;
    
    // Find a safe truncation point by looking for the last space within 60 chars
    const truncateAt = plainText.substring(0, 60).lastIndexOf(' ');
    const cutPoint = truncateAt > 0 ? truncateAt : 60;
    
    // For HTML descriptions, we need to be more careful to avoid breaking tags
    // For now, we'll use the plain text approach and let the user see full HTML in popup
    return plainText.substring(0, cutPoint) + '...';
  };

  // Function to fetch actual availability for this event
  const handleShowAvailableDates = async () => {
    if (!est || !baseApiUrl || availabilityFetched) return;
    
    setIsLoadingAvailability(true);
    setAvailabilityError(null);
    
    try {
      // Determine which month to check based on event start date
      let targetYear, targetMonth, monthDate;
      
      if (event.from) {
        // Parse event start date to determine target month
        const eventStartDate = new Date(event.from);
        const currentDate = new Date();
        
        // Check if event starts in current month
        const isCurrentMonth = (
          eventStartDate.getFullYear() === currentDate.getFullYear() &&
          eventStartDate.getMonth() === currentDate.getMonth()
        );
        
        if (isCurrentMonth) {
          // Event is in current month - use current month for availability check
          targetYear = currentDate.getFullYear();
          targetMonth = currentDate.getMonth() + 1; // 1-based month
          console.log(`🗓️ Event ${event.name} is in current month (${targetYear}-${String(targetMonth).padStart(2, '0')})`);
        } else {
          // Event is in future month - use event's start month for availability check
          targetYear = eventStartDate.getFullYear();
          targetMonth = eventStartDate.getMonth() + 1; // 1-based month
          console.log(`🗓️ Event ${event.name} is in future month (${targetYear}-${String(targetMonth).padStart(2, '0')}), checking that month instead`);
        }
      } else {
        // Fallback to current month if no event start date
        targetYear = currentMonth.getFullYear();
        targetMonth = currentMonth.getMonth() + 1;
        console.log(`⚠️ Event ${event.name} has no start date, using current month (${targetYear}-${String(targetMonth).padStart(2, '0')})`);
      }
      
      monthDate = `${targetYear}-${String(targetMonth).padStart(2, '0')}-01`;
      
      // Fetch month availability for this event using the appropriate month
      const monthAvailResponse = await fetchEventMonthAvailability(
        est, 
        event, 
        baseApiUrl, 
        monthDate
      );
      
      // Parse available dates from response using the target month
      const eventAvailableDates = parseEventAvailableDates(
        monthAvailResponse, 
        event.uid, 
        targetYear, 
        targetMonth
      );
      
      setAvailableDates(eventAvailableDates);
      setAvailabilityFetched(true);
      setIsDateListExpanded(true); // Auto-expand to show results
      
      // Update calendar with actual available dates for this event
      // This will replace any previously shown event availability on the calendar
      if (onAvailabilityUpdate) {
        onAvailabilityUpdate(event.uid, eventAvailableDates);
      }
      
      console.log(`Fetched ${eventAvailableDates.length} available dates for event ${event.uid}`);
      
    } catch (error) {
      console.error('Error fetching event availability:', error);
      setAvailabilityError(error.message);
    } finally {
      setIsLoadingAvailability(false);
    }
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
        </div>
      )}

      {/* Available Dates Section */}
      <div className="p-4">
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
            <button
              type="button"
              className="w-full flex justify-between items-center mb-2 text-sm font-semibold text-base-content hover:text-primary transition-colors"
              onClick={() => setIsDateListExpanded(!isDateListExpanded)}
            >
              <span>
                {languageStrings.availableDates || 'Available Dates'} ({availableDates.length})
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