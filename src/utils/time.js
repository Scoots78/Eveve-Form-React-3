// Helper function to format decimal time
export const formatDecimalTime = (decimalTime, timeFormat = 12) => { // timeFormat defaults to 12hr
  if (typeof decimalTime !== 'number') return '';
  let hours = Math.floor(decimalTime);
  const minutes = Math.round((decimalTime - hours) * 60);
  const formattedMinutes = minutes < 10 ? `0${minutes}` : minutes;

  if (timeFormat === 24) {
    const h = hours < 10 ? `0${hours}` : hours;
    return `${h}:${formattedMinutes}`;
  }

  // Default to 12-hour format with AM/PM
  const ampm = hours >= 12 && hours < 24 ? 'PM' : 'AM';
  if (hours === 0) { // Midnight case
    hours = 12;
  } else if (hours > 12 && hours < 24) { // PM times
    hours -= 12;
  }
  return `${hours}:${formattedMinutes} ${ampm}`;
};
