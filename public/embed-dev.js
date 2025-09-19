/**
 * Eveve Booking Widget Development Embed Script
 * Version 1.0.0-dev
 * 
 * This script allows embedding the Eveve booking widget from a local development server.
 * It uses an iframe approach to avoid module loading issues with Vite's development server.
 * 
 * Usage:
 * <div id="eveve-booking" data-restaurant="TestNZB" data-theme="cave-arrowtown"></div>
 * <script src="http://localhost:5173/form1-0-0/embed-dev.js"></script>
 */

(function() {
  // Get the script's own URL to determine dev server base path
  const scriptElement = document.currentScript || (function() {
    const scripts = document.getElementsByTagName('script');
    return scripts[scripts.length - 1];
  })();
  
  const scriptUrl = scriptElement.src;
  const scriptBasePath = scriptUrl.substring(0, scriptUrl.lastIndexOf('/') + 1);
  
  // Extract the development server origin (e.g., http://localhost:5173)
  const devServerOrigin = new URL(scriptUrl).origin;
  
  // Configuration
  const CONFIG = {
    devServerOrigin: devServerOrigin,
    basePath: scriptBasePath,
    defaultTheme: 'light',
    defaultSelector: '[data-eveve-widget], .eveve-widget, #eveve-booking',
    defaultContainerId: 'eveve-widget',
    iframeHeight: '700px',
    iframeResizeInterval: 500, // ms
    devModeIndicator: true
  };

  // Utility functions
  const utils = {
    // Create an iframe for development mode with postMessage communication
    createDevelopmentIframe: function(container, config) {
      // Create an iframe to load the full development version
      const iframe = document.createElement('iframe');
      iframe.style.width = '100%';
      iframe.style.height = CONFIG.iframeHeight;
      iframe.style.border = 'none';
      iframe.style.overflow = 'hidden';
      iframe.id = `${container.id}-iframe`;
      
      // Build the URL with all the parameters
      const queryParams = new URLSearchParams();
      queryParams.append('est', config.restaurant);
      if (config.theme) queryParams.append('theme', config.theme);
      if (config.themeCss) queryParams.append('themeCss', config.themeCss);
      if (config.lang) queryParams.append('lang', config.lang);
      if (config.defaultGuests) queryParams.append('guests', config.defaultGuests);
      if (config.defaultDate) queryParams.append('date', config.defaultDate);
      if (config.debug) queryParams.append('debug', 'true');
      
      // Create the full URL to the development server
      iframe.src = `${CONFIG.devServerOrigin}/?${queryParams.toString()}`;
      
      // Clear container and add iframe
      container.innerHTML = '';
      container.appendChild(iframe);
      
      // Set up communication between parent and iframe
      window.addEventListener('message', function(event) {
        // Only accept messages from our iframe
        if (event.source === iframe.contentWindow) {
          // Handle height adjustments
          if (event.data && event.data.type === 'resize') {
            iframe.style.height = `${event.data.height}px`;
          }
          
          // Forward booking events to parent document
          if (event.data && event.data.type === 'booking-event') {
            // Create and dispatch a custom event on the parent document
            const customEvent = new CustomEvent(`eveve-${event.data.eventName}`, {
              detail: event.data.detail,
              bubbles: true
            });
            container.dispatchEvent(customEvent);
            
            // Also log for debugging
            console.log(`[Eveve Widget DEV] Event forwarded: eveve-${event.data.eventName}`, event.data.detail);
          }
        }
      });
      
      // Inject a script into the iframe to capture and forward events
      iframe.addEventListener('load', function() {
        try {
          // Only inject if same origin (for local development)
          if (iframe.contentWindow.location.origin === window.location.origin) {
            const script = document.createElement('script');
            script.textContent = `
              // Capture booking events and forward to parent
              document.addEventListener('booking-success', function(e) {
                window.parent.postMessage({
                  type: 'booking-event',
                  eventName: 'booking-success',
                  detail: e.detail
                }, '*');
              });
              
              document.addEventListener('booking-error', function(e) {
                window.parent.postMessage({
                  type: 'booking-event',
                  eventName: 'booking-error',
                  detail: e.detail
                }, '*');
              });
              
              // Send height updates to parent
              const sendHeight = function() {
                const height = document.body.scrollHeight;
                window.parent.postMessage({
                  type: 'resize',
                  height: height
                }, '*');
              };
              
              // Send height periodically and on window resize
              window.addEventListener('resize', sendHeight);
              setInterval(sendHeight, ${CONFIG.iframeResizeInterval});
              sendHeight();
            `;
            iframe.contentDocument.head.appendChild(script);
          }
        } catch (e) {
          // Cross-origin restrictions may prevent this, which is fine
          console.log('[Eveve Widget DEV] Cross-origin iframe - event forwarding disabled');
        }
      });
      
      // Add development mode indicator
      if (CONFIG.devModeIndicator) {
        const devIndicator = document.createElement('div');
        devIndicator.style.position = 'absolute';
        devIndicator.style.top = '0';
        devIndicator.style.right = '0';
        devIndicator.style.backgroundColor = 'rgba(255, 193, 7, 0.8)';
        devIndicator.style.color = '#000';
        devIndicator.style.padding = '2px 6px';
        devIndicator.style.fontSize = '10px';
        devIndicator.style.fontFamily = 'monospace';
        devIndicator.style.borderRadius = '0 0 0 4px';
        devIndicator.style.zIndex = '9999';
        devIndicator.textContent = 'DEV MODE';
        container.style.position = 'relative';
        container.appendChild(devIndicator);
      }
      
      console.log(`[Eveve Widget DEV] Loading from development server: ${iframe.src}`);
      return iframe;
    },

    // Create a loading indicator
    createLoader: function() {
      const loader = document.createElement('div');
      loader.className = 'eveve-widget-loader';
      loader.innerHTML = `
        <style>
          .eveve-widget-loader {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 100%;
            min-height: 200px;
            padding: 20px;
            background-color: #f9fafb;
            border-radius: 8px;
          }
          .eveve-widget-spinner {
            width: 40px;
            height: 40px;
            border: 4px solid rgba(0, 0, 0, 0.1);
            border-left-color: #3b82f6;
            border-radius: 50%;
            animation: eveve-widget-spin 1s linear infinite;
          }
          @keyframes eveve-widget-spin {
            to { transform: rotate(360deg); }
          }
          .eveve-widget-loading-text {
            margin-left: 12px;
            font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            font-size: 16px;
            color: #4b5563;
          }
        </style>
        <div class="eveve-widget-spinner"></div>
        <div class="eveve-widget-loading-text">Loading booking widget (DEV)...</div>
      `;
      return loader;
    },

    // Create an error message
    createErrorMessage: function(message) {
      const errorEl = document.createElement('div');
      errorEl.className = 'eveve-widget-error';
      errorEl.innerHTML = `
        <style>
          .eveve-widget-error {
            width: 100%;
            padding: 16px;
            background-color: #fee2e2;
            border: 1px solid #ef4444;
            border-radius: 8px;
            font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            color: #b91c1c;
          }
          .eveve-widget-error-title {
            font-weight: 600;
            margin-bottom: 8px;
            font-size: 16px;
          }
          .eveve-widget-error-message {
            font-size: 14px;
          }
        </style>
        <div class="eveve-widget-error-title">Error Loading Booking Widget (DEV)</div>
        <div class="eveve-widget-error-message">${message}</div>
      `;
      return errorEl;
    }
  };

  // Main widget initialization function
  function initializeWidget(container) {
    // Skip if already initialized
    if (container.dataset.eveveInitialized === 'true') {
      return;
    }

    // Mark as initialized to prevent duplicate initialization
    container.dataset.eveveInitialized = 'true';

    // Create a unique ID for this container if it doesn't have one
    if (!container.id) {
      container.id = `${CONFIG.defaultContainerId}-${Math.random().toString(36).substring(2, 9)}`;
    }

    // Get configuration from data attributes
    const config = {
      restaurant: container.dataset.restaurant || container.dataset.est,
      theme: container.dataset.theme || CONFIG.defaultTheme,
      themeCss: container.dataset.themeCss || null,
      lang: container.dataset.lang || 'en',
      defaultGuests: container.dataset.defaultGuests || null,
      defaultDate: container.dataset.defaultDate || null,
      debug: container.dataset.debug === 'true'
    };

    // Show loading state
    const loader = utils.createLoader();
    container.appendChild(loader);

    // Ensure we have a restaurant ID
    if (!config.restaurant) {
      container.innerHTML = '';
      container.appendChild(utils.createErrorMessage(
        'Missing restaurant ID. Please add a data-restaurant attribute to the widget container.'
      ));
      return;
    }

    // Build the query string for the widget
    const queryParams = new URLSearchParams();
    queryParams.append('est', config.restaurant);
    
    if (config.theme) queryParams.append('theme', config.theme);
    if (config.themeCss) queryParams.append('themeCss', config.themeCss);
    if (config.lang) queryParams.append('lang', config.lang);
    if (config.defaultGuests) queryParams.append('guests', config.defaultGuests);
    if (config.defaultDate) queryParams.append('date', config.defaultDate);
    if (config.debug) queryParams.append('debug', 'true');

    // Create a global configuration object for the React app to read
    window.__EVEVE_CONFIG__ = window.__EVEVE_CONFIG__ || {};
    window.__EVEVE_CONFIG__[container.id] = {
      est: config.restaurant,
      theme: config.theme,
      themeCss: config.themeCss,
      lang: config.lang,
      guests: config.defaultGuests,
      date: config.defaultDate,
      debug: config.debug,
      containerId: container.id,
      queryString: queryParams.toString()
    };

    // Add a special data attribute to the container with the query string
    container.dataset.eveveConfigId = container.id;

    // Use iframe approach for development
    utils.createDevelopmentIframe(container, config);
  }

  // Initialize all widgets on the page
  function initializeAllWidgets() {
    const containers = document.querySelectorAll(CONFIG.defaultSelector);
    containers.forEach(initializeWidget);
  }

  // Initialize widgets when the DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeAllWidgets);
  } else {
    initializeAllWidgets();
  }

  // Re-scan for new widgets when DOM changes (for dynamically added widgets)
  if (window.MutationObserver) {
    const observer = new MutationObserver(function(mutations) {
      mutations.forEach(function(mutation) {
        if (mutation.addedNodes && mutation.addedNodes.length > 0) {
          // Check if any of the added nodes match our selector
          mutation.addedNodes.forEach(function(node) {
            if (node.nodeType === 1 && node.matches && node.matches(CONFIG.defaultSelector)) {
              initializeWidget(node);
            } else if (node.nodeType === 1 && node.querySelectorAll) {
              const widgets = node.querySelectorAll(CONFIG.defaultSelector);
              widgets.forEach(initializeWidget);
            }
          });
        }
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  // Expose the initialization function globally for manual initialization
  window.EveveWidget = {
    init: initializeWidget,
    initAll: initializeAllWidgets
  };

  // Log development mode
  console.log(`[Eveve Widget] DEVELOPMENT MODE - Using server at ${CONFIG.devServerOrigin}`);
})();
