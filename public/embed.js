/**
 * Eveve Booking Widget Embed Script
 * Version 1.0.0
 * 
 * This script allows easy embedding of the Eveve booking widget into any website.
 * 
 * Simple usage:
 * 1. Add this script to your page:
 *    <script src="https://yourdomain.com/form1-0-0/embed.js"></script>
 * 
 * 2. Add a container div anywhere on your page:
 *    <div id="eveve-booking" data-restaurant="123" data-theme="brand-roboto"></div>
 */

(function() {
  // Get the script's own URL to determine base path
  const scriptElement = document.currentScript || (function() {
    const scripts = document.getElementsByTagName('script');
    return scripts[scripts.length - 1];
  })();
  
  const scriptUrl = scriptElement.src;
  const scriptBasePath = scriptUrl.substring(0, scriptUrl.lastIndexOf('/') + 1);
  
  // Configuration - all paths are relative to the script's location
  const CONFIG = {
    basePath: scriptBasePath,
    cssPath: 'assets/index-D6KS7z4e.css',
    jsPath: 'assets/index-Bf_GMni7.js',
    themesPath: 'themes/',
    defaultTheme: 'light',
    defaultSelector: '[data-eveve-widget], .eveve-widget, #eveve-booking',
    defaultContainerId: 'eveve-widget'
  };

  // Utility functions
  const utils = {
    // Load a script asynchronously
    loadScript: function(src, callback) {
      const script = document.createElement('script');
      script.async = true;
      script.src = src;
      script.onload = callback;
      script.onerror = function() {
        console.error(`[Eveve Widget] Failed to load script: ${src}`);
        if (callback) callback(new Error(`Failed to load script: ${src}`));
      };
      document.head.appendChild(script);
    },

    // Load a stylesheet
    loadStylesheet: function(href) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = href;
      document.head.appendChild(link);
    },

    // Get absolute URL from relative path (relative to script location)
    getAbsoluteUrl: function(path) {
      // If already absolute, return as is
      if (/^https?:\/\//i.test(path)) {
        return path;
      }
      
      // Otherwise, resolve against the script's base URL
      return `${CONFIG.basePath}${path}`;
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
        <div class="eveve-widget-loading-text">Loading booking widget...</div>
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
        <div class="eveve-widget-error-title">Error Loading Booking Widget</div>
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

    // Create the widget container with proper theme
    const widgetContainer = document.createElement('div');
    widgetContainer.id = 'eveve-widget';
    widgetContainer.setAttribute('data-theme', config.theme);
    
    // Create the root element for React
    const rootElement = document.createElement('div');
    rootElement.id = 'root';
    widgetContainer.appendChild(rootElement);

    // Build the query string for the widget
    const queryParams = new URLSearchParams();
    queryParams.append('est', config.restaurant);
    
    if (config.theme) queryParams.append('theme', config.theme);
    if (config.themeCss) queryParams.append('themeCss', config.themeCss);
    if (config.lang) queryParams.append('lang', config.lang);
    if (config.defaultGuests) queryParams.append('guests', config.defaultGuests);
    if (config.defaultDate) queryParams.append('date', config.defaultDate);
    if (config.debug) queryParams.append('debug', 'true');

    // Ensure CSS is loaded (once)
    const cssUrl = utils.getAbsoluteUrl(CONFIG.cssPath);
    if (!document.querySelector(`link[href="${cssUrl}"]`)) {
      utils.loadStylesheet(cssUrl);
    }

    // Load theme CSS if specified and not already loaded
    if (config.theme && !config.themeCss) {
      const themeCssPath = `${CONFIG.themesPath}${config.theme}.css`;
      const themeCssUrl = utils.getAbsoluteUrl(themeCssPath);
      if (!document.querySelector(`link[href="${themeCssUrl}"]`)) {
        utils.loadStylesheet(themeCssUrl);
      }
    } else if (config.themeCss) {
      // If themeCss is a relative URL, resolve it against the script base
      const themeCssUrl = utils.getAbsoluteUrl(config.themeCss);
      if (!document.querySelector(`link[href="${themeCssUrl}"]`)) {
        utils.loadStylesheet(themeCssUrl);
      }
    }

    // Add styles for the container
    const containerStyles = document.createElement('style');
    containerStyles.textContent = `
      #${container.id} {
        width: 100%;
        max-width: 100%;
        margin: 0 auto;
        font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      }
    `;
    document.head.appendChild(containerStyles);

    // Replace loader with the widget container
    container.innerHTML = '';
    container.appendChild(widgetContainer);

    // Load the widget script
    const jsUrl = utils.getAbsoluteUrl(CONFIG.jsPath);
    utils.loadScript(jsUrl, function(error) {
      if (error) {
        container.innerHTML = '';
        container.appendChild(utils.createErrorMessage(
          'Failed to load the booking widget. Please try again later or contact support.'
        ));
        return;
      }

      // Script loaded successfully
      console.log(`[Eveve Widget] Initialized for restaurant ID: ${config.restaurant}`);
    });
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
})();
