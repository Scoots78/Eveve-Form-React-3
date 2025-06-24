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
      if (scriptText.includes("const lng = {") && scriptText.includes("const weekDays = [")) {
        configScriptContent = scriptText;
        break;
      }
    }

    if (!configScriptContent) {
      const errorMsg = `Could not find the main configuration script block in the HTML fetched from ${url}.`;
      console.error(errorMsg);
      throw new Error(errorMsg);
    }

    // console.log("Extracted script content snippet:", configScriptContent.substring(0, 500));

    const extractedConfigs = {};

    // Helper function to extract variables. Handles strings, arrays, objects, numbers, booleans.
    // Note: This is a simplified parser. Complex objects or function definitions might not be fully captured.
    const extractVar = (varName, scriptContent) => {
      // Regex to find variable declarations (const, let, var)
      // It tries to capture everything until a semicolon or, for objects/arrays, the closing bracket/brace.
      // This is a best-effort regex and might need to be more robust.
      const regex = new RegExp(`(?:const|var|let)\\s+${varName}\\s*=\\s*([^;]+)(?:;|$)`, "m");
      const match = scriptContent.match(regex);

      if (match && match[1]) {
        let value = match[1].trim();
        // Remove trailing comma if it's part of an object/array that got cut off by semicolon
        if (value.endsWith(',')) {
          value = value.substring(0, value.length -1);
        }

        try {
          // Attempt to parse it as JSON/JS literal.
          // A more robust solution might involve a proper JS parser or more specific regexes per type.
          // For now, we'll try a direct eval-like approach via Function constructor for safety.
          // This is still risky if the script content is not what we expect.
          // A safer way for complex objects/arrays is to use more targeted regex or a parser.
          if ((value.startsWith('{') && value.endsWith('}')) || (value.startsWith('[') && value.endsWith(']'))) {
             // For objects and arrays, it's often safer to use more specific regexes
             // or ensure the script structure is very predictable.
             // The provided example has complex objects; a simple regex for "lng" would be tricky.
             // For now, let's focus on simpler values and plan to refine object/array parsing.
            if (varName === 'lng') { // Special handling for 'lng' as it's large and complex
                const lngStartIndex = scriptContent.indexOf('const lng = {');
                if (lngStartIndex > -1) {
                    let openBraces = 0;
                    let lngEndIndex = -1;
                    for (let i = lngStartIndex + "const lng = ".length; i < scriptContent.length; i++) {
                        if (scriptContent[i] === '{') {
                            openBraces++;
                        } else if (scriptContent[i] === '}') {
                            openBraces--;
                            if (openBraces === 0) {
                                lngEndIndex = i + 1;
                                break;
                            }
                        }
                    }
                    if (lngEndIndex > -1) {
                        value = scriptContent.substring(lngStartIndex + "const lng = ".length, lngEndIndex);
                    } else {
                         console.warn(`Could not properly find the end of the lng object for ${varName}`);
                         return null; // Or handle error
                    }
                } else {
                    console.warn(`Could not find start of lng object for ${varName}`);
                    return null;
                }
            }
            // For other objects/arrays, the general regex might be okay or might need specific handling
            // For example: const weekDays = ['Mon', 'Tue', ...];
            // const backColours = { availB:'#227a33', ... };
          }

          // Using Function to evaluate, safer than direct eval
          return new Function(`return ${value}`)();
        } catch (e) {
          console.warn(`Could not parse value for ${varName}: ${value}. Error: ${e.message}. Falling back to string.`);
          // Fallback for simple strings that might not need full parsing but were matched.
          // e.g. const estLang = 'en'; -> 'en' (string with quotes)
          // If it's meant to be a string literal, remove quotes.
          if (value.startsWith("'") && value.endsWith("'")) return value.slice(1, -1);
          if (value.startsWith('"') && value.endsWith('"')) return value.slice(1, -1);
          return value; // Return as is if parsing fails (might be a simple number or boolean already)
        }
      }
      return null;
    };

    // Define the list of variables to extract based on CONFIG_VARIABLES_FROM_OLD_JS_APP.md
    // and the provided HTML script sample.
    // Variables from CONFIG_VARIABLES_FROM_OLD_JS_APP.md (using JS names from sample where known):
    // - estName (for estNameForApi)
    // - lng (for languageStrings)
    // - partyMin (for minGuests)
    // - partyMax (for maxGuests)
    // - areaAny (for areaAny)
    // - arSelect (for arSelect)
    // - usrLang (for usrLang)
    // - currSym (for currSym)
    // - eventsB (for eventsB)
    // - backColours (Bonus, from sample)
    // - tmsVersion (Bonus, from sample)
    // - estFull (Bonus, from sample)
    //
    // Variables mentioned in MD but not in sample (potential names, might need verification against actual full HTML):
    // - AREA_ANY_DEFAULT_SELECTED (for areaAnySelected)
    // - SHOW_UNAVAILABLE_SLOTS (for showUnavailableSlotsConfig)
    // - DATE_FORMAT (for dateFormat)
    // - TIME_FORMAT (for timeFormat)
    // - DISABLE_PAST_DATES (for disablePast)

    const variablesToExtract = [
      // Key variables from CONFIG_VARIABLES_FROM_OLD_JS_APP.md (using names found in sample HTML)
      "estName",        // Corresponds to estNameForApi (RESTAURANT_ID)
      "lng",            // Corresponds to languageStrings (LANG_STRINGS)
      "partyMin",       // Corresponds to minGuests (MIN_GUESTS)
      "partyMax",       // Corresponds to maxGuests (MAX_GUESTS)
      "areaAny",        // Corresponds to areaAny (AREA_ANY_AVAILABLE)
      "arSelect",       // Corresponds to arSelect (AREA_SELECTION_AVAILABLE)
      "usrLang",        // Corresponds to usrLang (USER_LANG)
      "currSym",        // Corresponds to currSym (CURRENCY_SYMBOL)
      "eventsB",        // Corresponds to eventsB (EVENT_JSON_STRING)

      // Other important variables observed in the sample HTML
      "estLang",
      "weekDays",
      "weekDaysSun",
      "months",
      "month3",
      "prefCountry",
      "areaMsg",
      "backColours",
      "test", // boolean
      "tmsVersion",
      "tmsRelease",
      "redirect",
      "messages",       // Array of arrays/strings
      "allShifts",      // Array of objects
      "always",         // Array
      "loyaltyOptin",   // boolean
      "allergy",        // boolean
      "invoice",        // boolean
      "showEvents",     // boolean
      "eventMessages",  // Array of objects (marked as not actively used in MD, but present)
      "dapi",           // string (URL)
      "todayMonth", "today", "now", "todayYear", // Date/time related
      "narrowWin", "wideWin",
      "startSun",       // boolean
      "thankURL",
      "trailing",       // Array of arrays
      "days",           // Array
      "LinkPriv", "LinkTC",
      "estPhone",
      "horizon",        // number
      "timeStep",       // number
      "standbyOnline",  // boolean
      "maxRequest",     // null or number
      "estFull",        // string
      "country",
      "sisters",        // Array of objects (plural in sample)
      "options",        // Array
      "xtraNotes",
      "AvailPage",
      "ForLarger",
      "preSelected",    // object
      "selected",       // object (large and complex)
      "br",             // string (HTML break)

      // Variables declared with 'var' in the sample (might be global-like)
      "PERHEAD", "TOTAL", "addonError", "allergyYN", "areaName", "availMonth",
      "cache", "calendar", "cardRequired", "charge", "count", "created",
      "descMenu", "estCalendarAvail", "estNot", "eventName", "eventsActive",
      "focusCount", /* "from", "to", // these are fine as var names */
      "fullName", "invoiceRequired", "limited", "loading", "loyal",
      "noStandby", "portal", "monthFirst", "monthName", "shoulder",
      "sisterLoads", "sistersLoading", "sisterName", "sisterTimes", "telLink",
      "timesAvail", "onTheHour", "usrLang", // usrLang is listed above too, it's fine
      "vacateMsg", "viewPrivacy", "viewTerms"
    ];

    // Remove duplicates just in case, and ensure 'lng' uses its special parsing if necessary
    const uniqueVariablesToExtract = [...new Set(variablesToExtract)];

    for (const varName of uniqueVariablesToExtract) {
      // 'lng' has special handling within extractVar, other complex objects rely on the general regex for now.
      let value = extractVar(varName, configScriptContent);
      if (value !== null) {
        // Specifically decode currSym if it's a string
        if (varName === 'currSym' && typeof value === 'string') {
          value = value.replace(/&amp;#36;/g, '$').replace(/&#36;/g, '$');
          // Add other common currency entities if needed, e.g., for Euro or Pound
          value = value.replace(/&amp;euro;/g, '€').replace(/&euro;/g, '€');
          value = value.replace(/&amp;pound;/g, '£').replace(/&pound;/g, '£');
        }
        extractedConfigs[varName] = value;
      } else {
        console.warn(`Variable ${varName} could not be extracted.`);
      }
    }

    // Specific handling for 'lng' object due to its complexity and size
    // The generic extractVar was updated to include a more robust way for 'lng'
    // If it's still not perfect, it might need a dedicated parsing function.

    // console.log("Extracted Configs:", extractedConfigs);
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
