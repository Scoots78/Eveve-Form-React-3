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
 * @param {Object} props.languageStrings - Language strings from appConfig.lng
 * @param {string} props.timeFormat - Time format preference
 * @param {string} props.dateFormat - Date format preference
 */
export default function EventCarousel({ 
  events = [], 
  onDateSelect, 
  languageStrings = {},
  timeFormat = 'h:mm a',
  dateFormat = 'MMM d, yyyy'
}) {
  const [isExpanded, setIsExpanded] = useState(true);

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
        onClick={() => setIsExpanded(!isExpanded)}
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
        <span className={`transform transition-transform duration-200 ${isExpanded ? 'rotate-180' : 'rotate-0'}`}>
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
      {isExpanded && (
        <div className="p-4 bg-base-100">
          <div className="overflow-x-auto pb-2">
            <div className="flex gap-4 min-w-max">
              {processedEvents.map((event, index) => (
                <EventCard
                  key={event.uid || index}
                  event={event}
                  onDateClick={handleDateClick}
                  languageStrings={languageStrings}
                  timeFormat={timeFormat}
                  dateFormat={dateFormat}
                />
              ))}
            </div>
          </div>
          <p className="text-xs text-base-content/60 mt-2 italic text-center">
            {languageStrings.eventCarouselHint || 'Click on a date to book this event'}
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
function EventCard({ event, onDateClick, languageStrings, timeFormat, dateFormat, est, baseApiUrl, currentMonth }) {
  const [isDateListExpanded, setIsDateListExpanded] = useState(false);
  const [availabilityFetched, setAvailabilityFetched] = useState(false);
  const [isLoadingAvailability, setIsLoadingAvailability] = useState(false);
  const [availableDates, setAvailableDates] = useState([]);
  const [availabilityError, setAvailabilityError] = useState(null);

  // Function to fetch actual availability for this event
  const handleShowAvailableDates = async () => {
    if (!est || !baseApiUrl || availabilityFetched) return;
    
    setIsLoadingAvailability(true);
    setAvailabilityError(null);
    
    try {
      // Get the first day of the current month
      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth() + 1; // 1-based month
      const monthDate = `${year}-${String(month).padStart(2, '0')}-01`;
      
      // Fetch month availability for this event
      const monthAvailResponse = await fetchEventMonthAvailability(
        est, 
        event, 
        baseApiUrl, 
        monthDate
      );
      
      // Parse available dates from response
      const eventAvailableDates = parseEventAvailableDates(
        monthAvailResponse, 
        event.uid, 
        year, 
        month
      );
      
      setAvailableDates(eventAvailableDates);
      setAvailabilityFetched(true);
      setIsDateListExpanded(true); // Auto-expand to show results
      
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
        <div 
          className="p-4 text-sm text-base-content prose prose-sm max-w-none border-b border-base-300"
          dangerouslySetInnerHTML={{ __html: event.desc }}
        />
      )}

      {/* Available Dates Section */}
      <div className="p-4">
        <button
          type="button"
          className="w-full flex justify-between items-center mb-2 text-sm font-semibold text-base-content hover:text-primary transition-colors"
          onClick={() => setIsDateListExpanded(!isDateListExpanded)}
        >
          <span>
            {languageStrings.availableDates || 'Available Dates'} ({event.dateCount})
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

        {/* Date Chips */}
        <div className={`flex flex-wrap gap-2 ${isDateListExpanded ? '' : 'max-h-20 overflow-hidden'}`}>
          {event.dates.map((date, idx) => {
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
                    : 'bg-primary text-primary-content hover:bg-primary-focus hover:scale-105 cursor-pointer shadow-sm hover:shadow-md'
                  }
                `}
                title={isPast ? languageStrings.pastDate || 'Date has passed' : `${languageStrings.clickToBook || 'Click to book'}: ${format(date, dateFormat)}`}
              >
                {format(date, 'MMM d')}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
