import localLngData from '../i18n/en.json'; // Import the local JSON file
import { debugLog } from '../utils/debug';

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
  debugLog(`Fetching configuration from: ${url}`);

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

    // Track critical parse failures so we can alert only once per var
    const CRITICAL_CONFIGS = new Set(['eventsB', 'eventMessages']);
    const IGNORED_ALERT_VARS = new Set(['currSym', 'count']);
    const alertedVars = new Set();
    // Remove escaped/newline tokens that can break parsing for these vars
    const SANITIZE_NEWLINES = new Set(['eventsB', 'eventMessages']);

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

    // Helper function to extract variables using a safe scanner that respects quotes/brackets.
    // This avoids breaking on semicolons inside HTML entities (e.g., '&#36;') within strings.
    const extractVar = (varName, scriptContent) => {
      const declRegexes = [
        new RegExp(`(?:const|var|let)\\s+${varName}\\s*=`, 'm'),
        new RegExp(`window\\.${varName}\\s*=`, 'm')
      ];

      let startIndex = -1;
      for (const r of declRegexes) {
        const m = r.exec(scriptContent);
        if (m) {
          startIndex = scriptContent.indexOf('=', m.index) + 1;
          break;
        }
      }

      if (startIndex === -1) return null;

      // Scan forward until we hit a top-level semicolon not inside quotes/brackets
      let i = startIndex;
      let depthCurly = 0, depthSquare = 0, depthParen = 0;
      let inString = false, stringQuote = null, escapeNext = false, inTemplate = false;

      while (i < scriptContent.length) {
        const ch = scriptContent[i];

        if (inString) {
          if (escapeNext) { escapeNext = false; i++; continue; }
          if (ch === '\\') { escapeNext = true; i++; continue; }
          if (ch === stringQuote) { inString = false; stringQuote = null; i++; continue; }
          i++; continue;
        }
        if (inTemplate) {
          if (escapeNext) { escapeNext = false; i++; continue; }
          if (ch === '\\') { escapeNext = true; i++; continue; }
          if (ch === '`') { inTemplate = false; i++; continue; }
          i++; continue;
        }
        // Handle comments
        if (ch === '/') {
          const next = scriptContent[i+1];
          if (next === '/') { // line comment
            const nl = scriptContent.indexOf('\n', i+2);
            i = nl === -1 ? scriptContent.length : nl + 1;
            continue;
          }
          if (next === '*') { // block comment
            const end = scriptContent.indexOf('*/', i+2);
            i = end === -1 ? scriptContent.length : end + 2;
            continue;
          }
        }

        if (ch === '"' || ch === "'") { inString = true; stringQuote = ch; i++; continue; }
        if (ch === '`') { inTemplate = true; i++; continue; }
        if (ch === '{') { depthCurly++; i++; continue; }
        if (ch === '}') { depthCurly = Math.max(0, depthCurly-1); i++; continue; }
        if (ch === '[') { depthSquare++; i++; continue; }
        if (ch === ']') { depthSquare = Math.max(0, depthSquare-1); i++; continue; }
        if (ch === '(') { depthParen++; i++; continue; }
        if (ch === ')') { depthParen = Math.max(0, depthParen-1); i++; continue; }

        if (ch === ';' && depthCurly === 0 && depthSquare === 0 && depthParen === 0) {
          break;
        }
        i++;
      }

      if (i <= startIndex) return null;

      let value = scriptContent.slice(startIndex, i).trim();
      if (value.endsWith(',')) {
        value = value.substring(0, value.length -1);
      }

        // Sanitize newline sequences that have previously caused parse failures
        if (SANITIZE_NEWLINES.has(varName)) {
          // Replace both escaped sequences and literal CR/LF characters
          value = value
            .replace(/\\r\\n/g, ' ')
            .replace(/\\n/g, ' ')
            .replace(/\\r/g, ' ')
            .replace(/[\r\n]+/g, ' ')
            // Also guard against literal Unicode line separators if present
            .replace(/[\u2028\u2029]/g, ' ');
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
          // Alert only for critical vars, and only once per var
          if (CRITICAL_CONFIGS.has(varName) && !alertedVars.has(varName) && typeof window !== 'undefined' && typeof window.alert === 'function') {
            alertedVars.add(varName);
            const msg = [
              `Critical configuration failed to parse: ${varName}.`,
              `This often indicates invalid HTML/entities in the Eveve settings for est "${estId}" (e.g. stray \\\n or malformed '&#' codes).`,
              `The form may not function correctly until this is fixed.`
            ].join('\n');
            try { window.alert(msg); } catch (_) {}
          }
          
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
          
          // Special handling for showEventOnLoad - search all script blocks if not found in main config
          if (value === null && varName === 'showEventOnLoad') {
            // Search through ALL script blocks for showEventOnLoad
            for (let script of scripts) {
              const scriptText = script.textContent || script.innerText || "";
              if (scriptText.includes('showEventOnLoad')) {
                value = extractVar(varName, scriptText);
                if (value !== null) {
                  break;
                }
              }
            }
          }
          
          if (value !== null) {
            extractedConfigs[varName] = value;
          } else {
            //console.warn(`Variable ${varName} could not be extracted.`);
          }
        }
    }
    // Post-parse validation for critical variables (missing or wrong type)
    const missingOrInvalidCritical = [];
    if (!(Array.isArray(extractedConfigs.eventsB))) {
      missingOrInvalidCritical.push('eventsB');
    }
    if (!(Array.isArray(extractedConfigs.eventMessages))) {
      missingOrInvalidCritical.push('eventMessages');
    }
    if (missingOrInvalidCritical.length && typeof window !== 'undefined' && typeof window.alert === 'function') {
      // Avoid duplicate alerts if we already alerted in parse step for the same var(s)
      const varsToAlert = missingOrInvalidCritical.filter(v => CRITICAL_CONFIGS.has(v) && !IGNORED_ALERT_VARS.has(v) && !alertedVars.has(v));
      if (varsToAlert.length) {
        varsToAlert.forEach(v => alertedVars.add(v));
        const msg = [
          `Missing or invalid critical configuration: ${varsToAlert.join(', ')}.`,
          `This likely indicates invalid HTML/entities in the Eveve settings for est "${estId}".`,
          `Please correct the source data; event features may not work until fixed.`
        ].join('\n');
        try { window.alert(msg); } catch (_) {}
      }
    }
     debugLog("Extracted Configs (excluding local lng):", extractedConfigs);
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
