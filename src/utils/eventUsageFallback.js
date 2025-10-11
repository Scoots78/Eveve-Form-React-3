// Helper function to find usage policy from eventsB configuration for Event type shifts
export const findEventUsageFromConfig = (shift, appConfig) => {
  // Only apply this fallback for Event type shifts
  if (!shift || shift.type !== "Event" || !appConfig?.eventsB) {
    return undefined;
  }

  // For Event shifts, the shift UID should match the event UID in eventsB
  const eventUid = shift.uid;
  if (eventUid === undefined) {
    return undefined;
  }

  // Find the corresponding event in eventsB
  const matchingEvent = appConfig.eventsB.find(event => event.uid === eventUid);
  
  if (matchingEvent && matchingEvent.usage !== undefined) {
    console.log(`?? Event usage fallback: No usage policy found in day-avail for Event shift "${shift.name || shift.type}" (UID: ${eventUid}), falling back to eventsB data (usage: ${matchingEvent.usage})`);
    return matchingEvent.usage;
  }

  console.warn(`?? Event usage fallback: No usage policy found in day-avail or eventsB for Event shift "${shift.name || shift.type}" (UID: ${eventUid})`);
  return undefined;
};
