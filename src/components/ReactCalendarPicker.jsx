import React, { useState, useEffect } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
// Override specific default styles (removes fixed width & border)
import './calendar-override.css';

/**
 * ReactCalendarPicker - A modern React calendar component using react-calendar
 * Designed as a drop-in replacement for the flatpickr-based CalendarPicker
 */
const ReactCalendarPicker = ({
  date,
  onChange,
  disabledDates = [],
  eventDates = [], // NEW: Array of event dates to highlight
  onMonthChange,
  dateFormat,
  disablePast = true
}) => {
  // Track when component renders for debugging
  useEffect(() => {
    console.log(
      `%c[ReactCalendar] render – disabledDates length: ${disabledDates.length}, eventDates length: ${eventDates.length}`,
      "color:teal;font-weight:bold"
    );
  });

  // Track when disabledDates changes
  useEffect(() => {
    console.log(
      `%c[ReactCalendar] disabledDates changed – new length: ${disabledDates.length}`,
      "color:purple;font-weight:bold"
    );
  }, [disabledDates]);

  // Track when eventDates changes
  useEffect(() => {
    console.log(
      `%c[ReactCalendar] eventDates changed – new length: ${eventDates.length}`,
      "color:orange;font-weight:bold"
    );
  }, [eventDates]);

  // Function to determine if a date should be disabled
  const tileDisabled = ({ date, view }) => {
    // Only apply to month view
    if (view !== 'month') return false;

    // Disable past dates if required
    if (disablePast && date < new Date().setHours(0, 0, 0, 0)) {
      return true;
    }

    // Check if date is in disabledDates array
    return disabledDates.some(disabledDate => {
      return (
        date.getFullYear() === disabledDate.getFullYear() &&
        date.getMonth() === disabledDate.getMonth() &&
        date.getDate() === disabledDate.getDate()
      );
    });
  };

  // NEW: Function to add custom class names to tiles (for event highlighting)
  const tileClassName = ({ date, view }) => {
    // Only apply to month view
    if (view !== 'month') return null;

    // Check if this date is an event date
    const isEvent = eventDates.some(eventDate => {
      return (
        date.getFullYear() === eventDate.getFullYear() &&
        date.getMonth() === eventDate.getMonth() &&
        date.getDate() === eventDate.getDate()
      );
    });

    return isEvent ? 'event-date' : null;
  };

  // Handle month navigation
  const handleActiveStartDateChange = ({ activeStartDate, view }) => {
    if (view === 'month' && onMonthChange) {
      console.groupCollapsed(
        `%c[ReactCalendar] onMonthChange fired – yr:${activeStartDate.getFullYear()} m:${activeStartDate.getMonth() + 1}`,
        "color:orange;font-weight:bold"
      );
      
      console.log(
        `%c[ReactCalendar] calling parent onMonthChange callback`,
        "color:blue"
      );
      
      // Call the parent's onMonthChange with parameters that match the expected format
      onMonthChange(
        null, // selected (not used in our implementation)
        null, // dateStr (not used in our implementation)
        { 
          currentYear: activeStartDate.getFullYear(),
          currentMonth: activeStartDate.getMonth() // 0-based, like flatpickr
        }
      );
      
      console.groupEnd();
    }
  };

  // Handle date selection
  const handleDateChange = (newDate) => {
    if (onChange) {
      // Convert to array format to match the old flatpickr format
      onChange([newDate]);
    }
  };

  return (
    <>
      {/*
        Tailwind classes added:
        – mx-auto            → centres the wrapper horizontally on mobile
        – flex justify-center→ keeps the calendar centred within the wrapper
        – md:block           → reverts to normal block layout from the md breakpoint up
      */}
      <div className="react-calendar-wrapper mx-auto flex justify-center md:block">
      <Calendar
        value={date}
        onChange={handleDateChange}
        onActiveStartDateChange={handleActiveStartDateChange}
        tileDisabled={tileDisabled}
        tileClassName={tileClassName} // NEW: Add custom classes for event dates
        minDetail="month"
        maxDetail="month"
        /* Remove year-jump navigation (<< and >>) */
        prev2Label={null}
        next2Label={null}
        showNeighboringMonth={false}
        className="react-calendar-custom"
      />
      </div>
    </>
  );
};

export default ReactCalendarPicker;
