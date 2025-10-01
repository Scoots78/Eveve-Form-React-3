/**
 * Eveve Booking Widget IFRAME Embed Script
 * Version 1.0.2
 *
 * Use this script to embed the Eveve booking widget in an iframe.
 * Designed for production hosting at the domain root, e.g.:
 *   https://form-1-0-2.hosting.eveve.co.nz
 *
 * Usage on a customer site:
 * <div id="eveve-booking" data-restaurant="TestNZB" data-theme="cave-arrowtown"></div>
 * <script src="https://form-1-0-2.hosting.eveve.co.nz/embed-iframe.js"></script>
 */

(function() {
  // Identify this script and base path
  const scriptElement = document.currentScript || (function() {
    const scripts = document.getElementsByTagName('script');
    return scripts[scripts.length - 1];
  })();

  const scriptUrl = scriptElement.src;
  const scriptBasePath = scriptUrl.substring(0, scriptUrl.lastIndexOf('/') + 1);
  const appOrigin = new URL(scriptUrl).origin;

  const CONFIG = {
    appOrigin,
    basePath: scriptBasePath,
    defaultTheme: 'light',
    defaultSelector: '[data-eveve-widget], .eveve-widget, #eveve-booking',
    defaultContainerId: 'eveve-widget',
    iframeHeight: '700px',
    iframeResizeInterval: 500, // ms
    devModeIndicator: false
  };

  const utils = {
    createIframe: function(container, config) {
      const iframe = document.createElement('iframe');
      iframe.style.width = '100%';
      iframe.style.height = CONFIG.iframeHeight;
      iframe.style.border = 'none';
      iframe.style.overflow = 'hidden';
      iframe.style.transition = 'height 200ms ease';
      iframe.id = `${container.id}-iframe`;
      // Allow Payment Request API inside the embedded app
      try { iframe.allow = (iframe.allow ? iframe.allow + '; ' : '') + 'payment *'; } catch (_) {}
      try { iframe.allowPaymentRequest = true; iframe.setAttribute('allowpaymentrequest', 'true'); } catch (_) {}

      // Build query string for the app inside the iframe
      const queryParams = new URLSearchParams();
      queryParams.append('est', config.restaurant);
      if (config.theme) queryParams.append('theme', config.theme);
      if (config.themeCss) queryParams.append('themeCss', config.themeCss);
      if (config.lang) queryParams.append('lang', config.lang);
      if (config.defaultGuests) queryParams.append('guests', config.defaultGuests);
      if (config.defaultDate) queryParams.append('date', config.defaultDate);
      if (config.debug) queryParams.append('debug', 'true');

      // Load the app root with params
      iframe.src = `${CONFIG.appOrigin}/?${queryParams.toString()}`;

      container.innerHTML = '';
      container.appendChild(iframe);

      // Keep viewport anchored on resize when possible
      const isInViewport = (el) => {
        const r = el.getBoundingClientRect();
        return r.bottom > 0 && r.top < (window.innerHeight || document.documentElement.clientHeight);
      };

      window.addEventListener('message', function(event) {
        if (event.source === iframe.contentWindow) {
          // Height adjustments from inside app (when available)
          if (event.data && event.data.type === 'resize') {
            const targetHeight = Math.max(100, Number(event.data.height) || 0);
            const currentHeight = iframe.offsetHeight;
            if (Math.abs(targetHeight - currentHeight) < 4) return;

            const anchorScroll = document.activeElement === iframe || isInViewport(iframe);
            const beforeTop = anchorScroll ? iframe.getBoundingClientRect().top : 0;
            iframe.style.height = `${targetHeight}px`;
            if (anchorScroll) {
              requestAnimationFrame(() => {
                const afterTop = iframe.getBoundingClientRect().top;
                const delta = afterTop - beforeTop;
                if (Math.abs(delta) > 1) {
                  window.scrollBy(0, delta);
                }
              });
            }
          }

          // Forward booking events as bubbling CustomEvents
          if (event.data && event.data.type === 'booking-event') {
            const eventName = event.data.eventName;
            const detail = event.data.detail || {};
            const customEvent = new CustomEvent(`eveve-${eventName}`, {
              detail,
              bubbles: true
            });
            container.dispatchEvent(customEvent);

            // Push to GTM/GA4
            if (eventName === 'booking-success') {
              window.dataLayer = window.dataLayer || [];
              window.dataLayer.push({ event: 'eveve_booking_success', ...detail });
              if (window.gtag) window.gtag('event', 'eveve_booking_success', detail);
            }
            if (eventName === 'booking-error') {
              window.dataLayer = window.dataLayer || [];
              window.dataLayer.push({ event: 'eveve_booking_error', ...detail });
              if (window.gtag) window.gtag('event', 'eveve_booking_error', detail);
            }
          }
        }
      });

      // Attempt same-origin injection during local dev only
      iframe.addEventListener('load', function() {
        try {
          if (iframe.contentWindow.location.origin === window.location.origin) {
            const script = document.createElement('script');
            script.textContent = `
              // Forward booking events to parent
              document.addEventListener('booking-success', function(e) {
                window.parent.postMessage({ type: 'booking-event', eventName: 'booking-success', detail: e.detail }, '*');
              });
              document.addEventListener('booking-error', function(e) {
                window.parent.postMessage({ type: 'booking-event', eventName: 'booking-error', detail: e.detail }, '*');
              });
              // Height updates
              const sendHeight = () => {
                const doc = document.documentElement;
                const height = Math.max(doc.scrollHeight, document.body ? document.body.scrollHeight : 0);
                window.parent.postMessage({ type: 'resize', height }, '*');
              };
              try { const ro = new ResizeObserver(() => requestAnimationFrame(sendHeight)); ro.observe(document.documentElement); } catch (e) { window.addEventListener('resize', () => requestAnimationFrame(sendHeight)); }
              try { const mo = new MutationObserver(() => requestAnimationFrame(sendHeight)); mo.observe(document.documentElement, { subtree: true, childList: true, attributes: true, characterData: true }); } catch (e) {}
              setInterval(sendHeight, ${Math.max(1000, CONFIG.iframeResizeInterval)});
              window.addEventListener('load', sendHeight); document.addEventListener('DOMContentLoaded', sendHeight); sendHeight();
            `;
            iframe.contentDocument.head.appendChild(script);
          }
        } catch (e) {
          // Cross-origin (expected in production)
        }
      });

      // Optional visual indicator (disabled in production by default)
      if (CONFIG.devModeIndicator) {
        const badge = document.createElement('div');
        badge.style.position = 'absolute';
        badge.style.top = '0';
        badge.style.right = '0';
        badge.style.backgroundColor = 'rgba(59,130,246,0.85)';
        badge.style.color = '#fff';
        badge.style.padding = '2px 6px';
        badge.style.fontSize = '10px';
        badge.style.fontFamily = 'monospace';
        badge.style.borderRadius = '0 0 0 4px';
        badge.style.zIndex = '9999';
        badge.textContent = 'IFRAME MODE';
        container.style.position = 'relative';
        container.appendChild(badge);
      }

      return iframe;
    },

    createLoader: function() {
      const loader = document.createElement('div');
      loader.className = 'eveve-widget-loader';
      loader.innerHTML = `
        <style>
          .eveve-widget-loader { display:flex; align-items:center; justify-content:center; width:100%; min-height:200px; padding:20px; background-color:#f9fafb; border-radius:8px; }
          .eveve-widget-spinner { width:40px; height:40px; border:4px solid rgba(0,0,0,0.1); border-left-color:#3b82f6; border-radius:50%; animation:eveve-widget-spin 1s linear infinite; }
          @keyframes eveve-widget-spin { to { transform: rotate(360deg); } }
          .eveve-widget-loading-text { margin-left:12px; font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size:16px; color:#4b5563; }
        </style>
        <div class="eveve-widget-spinner"></div>
        <div class="eveve-widget-loading-text">Loading booking widget...</div>
      `;
      return loader;
    },

    createErrorMessage: function(message) {
      const errorEl = document.createElement('div');
      errorEl.className = 'eveve-widget-error';
      errorEl.innerHTML = `
        <style>
          .eveve-widget-error { width:100%; padding:16px; background-color:#fee2e2; border:1px solid #ef4444; border-radius:8px; font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color:#b91c1c; }
          .eveve-widget-error-title { font-weight:600; margin-bottom:8px; font-size:16px; }
          .eveve-widget-error-message { font-size:14px; }
        </style>
        <div class="eveve-widget-error-title">Error Loading Booking Widget</div>
        <div class="eveve-widget-error-message">${message}</div>
      `;
      return errorEl;
    }
  };

  function initializeWidget(container) {
    if (container.dataset.eveveInitialized === 'true') return;
    container.dataset.eveveInitialized = 'true';
    if (!container.id) container.id = `${CONFIG.defaultContainerId}-${Math.random().toString(36).substring(2, 9)}`;

    const config = {
      restaurant: container.dataset.restaurant || container.dataset.est || 'TestNZB',
      theme: container.dataset.theme || CONFIG.defaultTheme,
      themeCss: container.dataset.themeCss || null,
      lang: container.dataset.lang || 'en',
      defaultGuests: container.dataset.defaultGuests || null,
      defaultDate: container.dataset.defaultDate || null,
      debug: container.dataset.debug === 'true'
    };

    const loader = utils.createLoader();
    container.appendChild(loader);

    if (!config.restaurant) {
      container.innerHTML = '';
      container.appendChild(utils.createErrorMessage('Missing restaurant ID. Please add data-restaurant.'));
      return;
    }

    utils.createIframe(container, config);
  }

  function initializeAllWidgets() {
    const containers = document.querySelectorAll(CONFIG.defaultSelector);
    containers.forEach(initializeWidget);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeAllWidgets);
  } else {
    initializeAllWidgets();
  }

  if (window.MutationObserver) {
    const observer = new MutationObserver(function(mutations) {
      mutations.forEach(function(mutation) {
        if (mutation.addedNodes && mutation.addedNodes.length > 0) {
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
    observer.observe(document.body, { childList: true, subtree: true });
  }

  window.EveveWidget = { init: initializeWidget, initAll: initializeAllWidgets };
})();
