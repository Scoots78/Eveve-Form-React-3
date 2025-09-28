/**
 * Eveve Booking Widget INLINE Embed Script
 * Version 1.0.2
 *
 * Preferred embed method: mounts the app directly in the page inside a div.
 * Pros: Seamless styling with host page. Cons: Host CSS may conflict.
 *
 * Usage on a customer site:
 * <div id="eveve-booking" data-restaurant="TestNZB" data-theme="light"></div>
 * <script src="https://form-1-0-2.hosting.eveve.co.nz/embed-inline.js"></script>
 */

(function () {
  const scriptEl = document.currentScript || (function () {
    const scripts = document.getElementsByTagName('script');
    return scripts[scripts.length - 1];
  })();

  const scriptUrl = scriptEl.src;
  const baseUrl = scriptUrl.substring(0, scriptUrl.lastIndexOf('/') + 1);
  const appOrigin = new URL(scriptUrl).origin;

  const SELECTOR = '[data-eveve-widget], .eveve-widget, #eveve-booking';

  function pickContainer() {
    const nodes = document.querySelectorAll(SELECTOR);
    if (!nodes.length) return null;
    if (nodes.length > 1) {
      console.warn('[Eveve Inline] Multiple containers found. Inline mode supports one per page. Using the first.');
    }
    return nodes[0];
  }

  function ensureRoot(container) {
    const rootId = `eveve-root-${Math.random().toString(36).slice(2, 9)}`;
    const root = document.createElement('div');
    root.id = rootId;
    container.innerHTML = '';
    container.appendChild(root);
    return rootId;
  }

  function extractConfig(container) {
    return {
      est: container.getAttribute('data-restaurant') || container.getAttribute('data-est') || '',
      theme: container.getAttribute('data-theme') || 'light',
      themeCss: container.getAttribute('data-theme-css') || '',
      lang: container.getAttribute('data-lang') || 'en',
      guests: container.getAttribute('data-default-guests') || '',
      date: container.getAttribute('data-default-date') || '',
      debug: container.getAttribute('data-debug') === 'true'
    };
  }

  function injectCssOnce(href) {
    const id = 'eveve-inline-css';
    if (document.getElementById(id)) return;
    const link = document.createElement('link');
    link.id = id;
    link.rel = 'stylesheet';
    link.href = href;
    document.head.appendChild(link);
  }

  function injectScript(src, onload) {
    const s = document.createElement('script');
    s.type = 'module';
    s.crossOrigin = 'anonymous';
    s.src = src;
    if (onload) s.onload = onload;
    document.head.appendChild(s);
  }

  function wireAnalytics(container) {
    // Listen to app's DOM events and forward to GTM/GA4 + prefixed DOM events
    const onSuccess = function (e) {
      const detail = e.detail || {};
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({ event: 'eveve_booking_success', ...detail });
      if (window.gtag) window.gtag('event', 'eveve_booking_success', detail);
      try {
        const ce = new CustomEvent('eveve-booking-success', { detail, bubbles: true });
        container.dispatchEvent(ce);
      } catch (_) {}
    };

    const onError = function (e) {
      const detail = e.detail || {};
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({ event: 'eveve_booking_error', ...detail });
      if (window.gtag) window.gtag('event', 'eveve_booking_error', detail);
      try {
        const ce = new CustomEvent('eveve-booking-error', { detail, bubbles: true });
        container.dispatchEvent(ce);
      } catch (_) {}
    };

    document.addEventListener('booking-success', onSuccess);
    document.addEventListener('booking-error', onError);
  }

  function init() {
    const container = pickContainer();
    if (!container) {
      console.error('[Eveve Inline] No container found. Add a div with id="eveve-booking" or class="eveve-widget".');
      return;
    }

    const cfg = extractConfig(container);
    if (!cfg.est) {
      container.innerHTML = '<div style="padding:12px;border:1px solid #ef4444;background:#fee2e2;border-radius:8px;color:#b91c1c;font-family:system-ui,Segoe UI,Roboto">Missing restaurant ID. Add data-restaurant to the container.</div>';
      return;
    }

    const rootId = ensureRoot(container);
    // Wire analytics listeners before app mounts
    wireAnalytics(container);
    // Expose config for the app to read (ReservationForm fallbacks)
    window.__EVEVE_INLINE_ROOT_ID = rootId;
    window.__EVEVE_EMBED = cfg;

    // Load app assets from our origin
    injectCssOnce(appOrigin + '/assets/index.css');
    injectScript(appOrigin + '/assets/index.js');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
