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

  return (
    <div className="mt-6 p-4 border border-gray-200 rounded-lg shadow bg-white">
      <h4 className="text-lg font-semibold text-gray-700 mb-3">
        {languageStrings?.areaSelectionTitle || 'Select Seating Area'}
      </h4>
      
      <div className="addon-radio-group space-y-2">
        {/* "Any Area" option if enabled */}
        {areaAnyEnabled && (
          <div className="addon-item usage1-radio p-2 border rounded-md hover:bg-gray-50 transition-colors">
            <label htmlFor="area-any" className="flex items-center space-x-3 cursor-pointer">
              <input
                type="radio"
                id="area-any"
                name="area_selection"
                value="any"
                checked={selectedArea === 'any'}
                onChange={() => handleAreaChange('any')}
                className="form-radio h-5 w-5 text-blue-600 border-gray-300 focus:ring-blue-500"
              />
              <div className="flex-grow">
                <span className="addon-name font-medium text-gray-800">
                  {languageStrings?.anyArea || 'Any Area'}
                </span>
                <p className="text-xs text-gray-500 mt-1">
                  {languageStrings?.anyAreaDesc || 'No preference for seating area'}
                </p>
              </div>
            </label>
          </div>
        )}

        {/* Available specific areas */}
        {availableAreas.map((area) => (
          <div key={area.uid || area.id} className="addon-item usage1-radio p-2 border rounded-md hover:bg-gray-50 transition-colors">
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
                className="form-radio h-5 w-5 text-blue-600 border-gray-300 focus:ring-blue-500"
              />
              <div className="flex-grow">
                <span className="addon-name font-medium text-gray-800">{area.name}</span>
                {area.description && (
                  <p className="text-xs text-gray-500 mt-1">{area.description}</p>
                )}
              </div>
            </label>
          </div>
        ))}
      </div>

      {/* Optional helper text */}
      <p className="text-xs text-gray-500 mt-3">
        {languageStrings?.areaSelectionHelp || 'Select your preferred seating area (optional)'}
      </p>
    </div>
  );
};

export default AreaSelection;
