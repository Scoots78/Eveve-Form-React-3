import localLngData from '../i18n/en.json'; // Import the local JSON file

// src/config/configLoader.js

/**
 * Fetches the restaurant configuration HTML and parses out relevant JavaScript variables.
 * @param {string} estId - The establishment ID (e.g., 'TestNZ4').
 * @returns {Promise<Object>} A promise that resolves to an object containing the extracted variables.
 */
export async function loadAppConfig(estId) {
  if (!estId) {
    console.error("Establishment ID is required.");
    return Promise.reject("Establishment ID is required.");
  }

  const url = `https://nz.eveve.com/web/form?est=${estId}`;
  console.log(`Fetching configuration from: ${url}`);

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch HTML: ${response.status} ${response.statusText}`);
    }
    const htmlString = await response.text();

    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlString, "text/html");
    const scripts = doc.getElementsByTagName("script");

    let configScriptContent = "";
    for (let script of scripts) {
      const scriptText = script.textContent || script.innerText || "";
      // Try to find the main script block; this is a heuristic and might need refinement.
      // Looking for a script that defines a significant number of our target variables.
      if (scriptText.includes("const weekDays = [") || scriptText.includes("var PERHEAD =")) { // Broadened search condition
        configScriptContent = scriptText;
        break;
      }
    }

    if (!configScriptContent && estId) { // only warn if estId was provided, otherwise it's expected
      const errorMsg = `Could not find the main configuration script block in the HTML fetched from ${url}. Other configurations (besides language strings) might be missing.`;
      console.warn(errorMsg);
    } else if (!configScriptContent && !estId) {
       console.log("No estId provided, skipping remote config script extraction. Only local language strings will be available.");
    }


    const extractedConfigs = {};

    // Use the imported local language data
    let localLng = localLngData; // Assign imported data
    try {
      // Create a Proxy for the localLng object to log access
      const loggingLngHandler = {
        get: function(target, prop, receiver) {
          if (prop in target) {
            //console.log(`Language variable accessed: lng.${prop}`);
            return target[prop];
          }
          // If the key is not found, log an error and return a placeholder
          console.error(`Language variable "lng.${prop}" not found in local language file.`);
          return `[lng.${prop}]`; // Placeholder for missing translations
        }
      };
      extractedConfigs.lng = new Proxy(localLng, loggingLngHandler);

    } catch (e) {
      console.error("Could not load or parse local language file src/i18n/en.json", e);
      // Fallback to a minimal lng object with logging if localLngData itself is problematic (e.g. not valid JSON)
      const fallbackLng = {};
      extractedConfigs.lng = new Proxy(fallbackLng, {
        get: function(target, prop) {
          console.error(`Fallback lng: Language variable "lng.${prop}" accessed, but local file failed to load or parse.`);
          return `[lng.${prop}_LOAD_FAILED]`;
        }
      });
    }

    // Helper function to extract variables. Only run if configScriptContent was found.
    // Handles strings, arrays, objects, numbers, booleans with improved error handling.
    const extractVar = (varName, scriptContent) => {
      const regex = new RegExp(`(?:const|var|let)\\s+${varName}\\s*=\\s*([^;]+)(?:;|$)`, "m");
      const match = scriptContent.match(regex);

      if (match && match[1]) {
        let value = match[1].trim();
        if (value.endsWith(',')) {
          value = value.substring(0, value.length -1);
        }

        // Handle simple string values first (most common case)
        if ((value.startsWith("'") && value.endsWith("'")) || (value.startsWith('"') && value.endsWith('"'))) {
          return value.slice(1, -1);
        }

        // Handle numbers and booleans
        if (/^-?\d+(\.\d+)?$/.test(value)) {
          return parseFloat(value);
        }
        if (value === 'true') return true;
        if (value === 'false') return false;
        if (value === 'null') return null;
        if (value === 'undefined') return undefined;

        try {
          // For complex objects/arrays, use more careful parsing
          if ((value.startsWith('{') && value.endsWith('}')) || (value.startsWith('[') && value.endsWith(']'))) {
            // Try JSON.parse first for safer parsing
            try {
              return JSON.parse(value);
            } catch (jsonError) {
              // If JSON.parse fails, try Function constructor as fallback
              return new Function(`return ${value}`)();
            }
          }
          
          // For other complex values, use Function constructor
          return new Function(`return ${value}`)();
        } catch (e) {
          console.warn(`Could not parse value for ${varName}: ${value.substring(0, 100)}${value.length > 100 ? '...' : ''}. Error: ${e.message}. Falling back to string.`);
          
          // Better fallback handling for malformed strings
          if (value.startsWith("'")) {
            // Find the last single quote, handle cases where string might be malformed
            const lastQuote = value.lastIndexOf("'");
            if (lastQuote > 0) {
              return value.substring(1, lastQuote);
            }
          }
          if (value.startsWith('"')) {
            // Find the last double quote, handle cases where string might be malformed
            const lastQuote = value.lastIndexOf('"');
            if (lastQuote > 0) {
              return value.substring(1, lastQuote);
            }
          }
          
          // If all else fails, return the raw value as string
          return value;
        }
      }
      return null;
    };

    const variablesToExtract = [
      "estName", "partyMin", "partyMax", "areaAny", "arSelect", "usrLang", "currSym", "eventsB",
      "estLang", "weekDays", "weekDaysSun", "months", "month3", "prefCountry", "areaMsg",
      "backColours", "test", "tmsVersion", "tmsRelease", "redirect", "messages", "allShifts",
      "always", "loyaltyOptin", "allergy", "invoice", "showEvents", "eventMessages", "dapi",
      "todayMonth", "today", "now", "todayYear", "narrowWin", "wideWin", "startSun", "thankURL",
      "trailing", "days", "LinkPriv", "LinkTC", "estPhone", "horizon", "timeStep",
      "standbyOnline", "maxRequest", "estFull", "country", "sisters", "options", "xtraNotes",
      "AvailPage", "ForLarger", "preSelected", "selected", "br",
      "PERHEAD", "TOTAL", "addonError", "allergyYN", "areaName", "availMonth", "cache",
      "calendar", "cardRequired", "charge", "count", "created", "descMenu",
      "estCalendarAvail", "estNot", "eventName", "eventsActive", "focusCount",
      "fullName", "invoiceRequired", "limited", "loading", "loyal", "noStandby",
      "portal", "monthFirst", "monthName", "shoulder", "sisterLoads", "sistersLoading",
      "sisterName", "sisterTimes", "telLink", "timesAvail", "onTheHour", "vacateMsg",
      "viewPrivacy", "viewTerms", "showEventOnLoad"
      // "lng" is removed from this list as it's now sourced locally.
    ];

    const uniqueVariablesToExtract = [...new Set(variablesToExtract)];

    if (configScriptContent) { // Only try to extract if we found the script
        for (const varName of uniqueVariablesToExtract) {
          if (varName === 'lng') continue; // Skip lng as it's handled locally

          let value = extractVar(varName, configScriptContent);
          if (value !== null) {
            extractedConfigs[varName] = value;
          } else {
            //console.warn(`Variable ${varName} could not be extracted.`);
          }
        }
    }
     console.log("Extracted Configs (excluding local lng):", extractedConfigs);
    return extractedConfigs;

  } catch (error) {
    console.error("Error in loadAppConfig:", error);
    throw error; // Re-throw the error to be caught by the caller
  }
}

// Example of how to use (for testing purposes, remove or comment out later):
/*
async function testConfig() {
  try {
    const config = await loadAppConfig('TestNZ4'); // Eveve UID from the problem description
    console.log('Successfully loaded config:', config);
    if (config.estName) {
      console.log('Restaurant Name:', config.estName);
    }
    if (config.lng && config.lng.Book) {
        console.log('Language string for "Book":', config.lng.Book )
    }
     if (config.weekDays) {
        console.log('Weekdays:', config.weekDays);
    }
    if (config.tmsVersion) {
        console.log('TMS Version:', config.tmsVersion)
    }
  } catch (error) {
    console.error('Failed to load config for testing:', error);
  }
}
testConfig();
*/
