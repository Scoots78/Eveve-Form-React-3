import React from 'react';

const AreaSelection = ({
  availableAreas,
  selectedArea,
  onAreaChange,
  areaAnyEnabled,
  languageStrings,
}) => {
  if (!availableAreas || availableAreas.length === 0) {
    return null; // Don't render anything if no areas are available
  }

  // Handle area selection change
  const handleAreaChange = (area) => {
    onAreaChange(area);
  };

  // Debug log – helps verify the flag coming from appConfig
  /* eslint-disable no-console */
  console.log(
    "[AreaSelection] areaAnyEnabled →",
    areaAnyEnabled,
    `(type: ${typeof areaAnyEnabled})`
  );
  /* eslint-enable no-console */

  /*
    The Eveve config loader currently passes `areaAny` straight from the
    remote script.  In some restaurants this comes through as a boolean
    (true/false) but in others it arrives as a string ('true' / 'false').

    A direct equality check (`=== true`) inside ReservationForm therefore
    turned truthy strings into *false*, which caused the mismatch you saw
    in the console (“areaAny is true but areaAnyEnabled is false”).

    We NORMALISE the prop here:
      - treat boolean true  OR string 'true'  → allowed
      - otherwise                               → not allowed

    `areaAnyAllowed` is the canonical boolean we use everywhere below.
  */
  const areaAnyAllowed =
    areaAnyEnabled === true || areaAnyEnabled === 'true';
  const isRequired = !areaAnyAllowed;

  /* eslint-disable no-console */
  console.log(
    "[AreaSelection] derived areaAnyAllowed →",
    areaAnyAllowed,
    `(after coercion, type: ${typeof areaAnyAllowed})`
  );
  /* eslint-enable no-console */

  return (
    <div className="mt-6 p-4 border border-base-300 rounded-lg shadow bg-base-100">
      <h4 className="text-lg font-semibold text-base-content mb-3">
        {languageStrings?.areaSelectionTitle || 'Select Seating Area'}
        {isRequired && (
          <span className="text-error ml-1" title="Required">*</span>
        )}
      </h4>
      
      <div className="addon-radio-group space-y-2">
        {/* "Any Area" option when it is allowed */}
        {areaAnyAllowed && (
          <div className="addon-item usage1-radio p-2 border rounded-md hover:bg-base-300 transition-colors">
            <label htmlFor="area-any" className="flex items-center space-x-3 cursor-pointer">
              <input
                type="radio"
                id="area-any"
                name="area_selection"
                value="any"
                checked={selectedArea === 'any'}
                onChange={() => handleAreaChange('any')}
                className="form-radio h-5 w-5 text-primary border-base-300 focus:ring-primary"
              />
              <div className="flex-grow">
                <span className="addon-name font-medium text-base-content">
                  {languageStrings?.anyArea || 'Any Area'}
                </span>
                <p className="text-xs text-base-content/60 mt-1">
                  {languageStrings?.anyAreaDesc || 'No preference for seating area'}
                </p>
              </div>
            </label>
          </div>
        )}

        {/* Available specific areas */}
        {availableAreas.map((area) => (
          <div key={area.uid || area.id} className="addon-item usage1-radio p-2 border rounded-md hover:bg-base-300 transition-colors">
            <label 
              htmlFor={`area-${area.uid || area.id}`} 
              className="flex items-center space-x-3 cursor-pointer"
            >
              <input
                type="radio"
                id={`area-${area.uid || area.id}`}
                name="area_selection"
                value={area.uid || area.id}
                checked={selectedArea === (area.uid || area.id)}
                onChange={() => handleAreaChange(area.uid || area.id)}
                className="form-radio h-5 w-5 text-primary border-base-300 focus:ring-primary"
              />
              <div className="flex-grow">
                <span className="addon-name font-medium text-base-content">{area.name}</span>
              </div>
            </label>
          </div>
        ))}
      </div>

      {/* Optional helper text */}
      <p
        className={`text-xs mt-3 ${
          isRequired ? 'text-error' : 'text-base-content/60'
        }`}
      >
        {isRequired
          ? languageStrings?.areaSelectionRequired ||
            'Area selection is required to proceed'
          : languageStrings?.areaSelectionHelp ||
            'Select your preferred seating area (optional)'}
      </p>
    </div>
  );
};

export default AreaSelection;
