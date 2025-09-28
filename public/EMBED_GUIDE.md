# Eveve Booking Widget – Embed Guide  
*Version 1.0.2*  

Welcome 👋 and thanks for choosing the Eveve booking widget!  
This guide shows **everything you need** to embed the widget on any website or CMS.

---

## 1 · Why It’s Easy  

The widget is a **fully-hosted**, self-contained application served from  
`https://form-1-0-2.hosting.eveve.co.nz/`.  

**You do NOT need to upload any files to your own server.**  
All CSS, JavaScript and theme assets are loaded automatically from our CDN.

To embed it you only need:

1. A container element (`<div>`) where the widget should appear.  
2. **One** `<script>` tag that points to our domain.  

The embed script automatically:

* injects the required CSS & JS  
* initialises every container it finds  
* supports multiple widgets per page  
* works in any modern browser, CMS or page-builder  

---

## 2 · Quick Start (Preferred: Inline Embed)  

```html
<!-- 1. Widget container (inline, no iframe) -->
<div id="eveve-booking"
     data-restaurant="123"          <!-- ⭐ required -->
     data-theme="brand-roboto">     <!-- optional -->
</div>

<!-- 2. ONE script tag – load once per page, ideally before </body> -->
<script src="https://form-1-0-2.hosting.eveve.co.nz/embed-inline.js"></script>
```

That’s it – the widget mounts directly inside your div (no iframe).  
Zero install. Zero assets hosted on your side.  
For the iframe fallback, see section 2b.

Notes:
- Inline embed automatically creates an internal wrapper `#eveve-widget` and applies `data-theme` to it so theme CSS (e.g. `themes/brand-roboto.css`) scopes correctly.
- Theme CSS is auto-injected based on `data-theme` (or you can provide a full URL with `data-theme-css`).

---

## 2b · Alternative: Iframe Embed (direct)

If you prefer to embed a direct iframe (legacy/dev-style), use this pattern:

```html
<!-- Direct iframe embed -->
<iframe
  id="eveve-booking-iframe"
  src="https://form-1-0-2.hosting.eveve.co.nz/?est=YOUR_EST_UID&theme=light&lang=en"
  allow="payment *"
  allowpaymentrequest
  style="width:100%; border:0; overflow:hidden; transition:height 200ms ease;"
  loading="lazy"
></iframe>

<script>
  const iframe = document.getElementById('eveve-booking-iframe');
  window.addEventListener('message', function (e) {
    if (!e || !e.data || typeof e.data !== 'object') return;
    if (e.source !== iframe.contentWindow) return;
    // Optional: tighten origin check
    // if (e.origin !== new URL(iframe.src).origin) return;

    if (e.data.type === 'resize') {
      const h = Math.max(120, Number(e.data.height) || 0);
      iframe.style.height = h + 'px';
    }

    if (e.data.type === 'booking-event' && e.data.eventName === 'booking-success') {
      const detail = e.data.detail || {};
      // Send to GA4/GTM – see Analytics section below for full examples
      if (window.gtag) {
        window.gtag('event', 'eveve_booking_success', detail);
      }
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({ event: 'eveve_booking_success', ...detail });
    }
  });
  // Optional: initial height while waiting for first resize
  iframe.style.height = '700px';
  // Note: The app inside the iframe posts resize + booking events automatically.
  // This listener is required for analytics and smooth resizing when using direct iframes.
  // With the scripted iframe embed (`embed-iframe.js`), both the listener and
  // the payment permissions (allow/allowpaymentrequest) are handled for you.
</script>
```

Parameters supported on the iframe `src` URL:
- `est` (required)
- `theme`, `themeCss`, `lang`, `guests`, `date`, `debug`

---

## 3 · Container Attributes  

| Attribute                            | Required | Description                                                                                                   |
|--------------------------------------|----------|---------------------------------------------------------------------------------------------------------------|
| `data-restaurant` / `data-est`       | **Yes**  | Your Eveve establishment ID.                                                                                  |
| `data-theme`                         | No       | Theme name (`brand-roboto`, `light`, `dark`, …). Default **light**.                                           |
| `data-theme-css`                     | No       | URL of a custom CSS theme. If omitted we auto-load `themes/{theme}.css` from our CDN.                          |
| `data-default-guests`                | No       | Pre-select guest count.                                                                                       |
| `data-default-date`                  | No       | Pre-select date (`YYYY-MM-DD`).                                                                               |
| `data-lang`                          | No       | Language code (`en`, `es`, …). Default **en**.                                                                |
| `data-debug`                         | No       | `true` shows developer logs/debug panel.                                                                      |

You may use **either** `data-restaurant` **or** `data-est` – they’re interchangeable.

---

## 4 · Multiple Widgets on the Same Page  

Just add more containers – the script initialises each one independently.

```html
<div class="eveve-widget" data-restaurant="TestNZB" data-theme="light"></div>
<div class="eveve-widget" data-restaurant="TestNZB" data-theme="brand-roboto"
     data-default-guests="4"></div>

<script src="https://form-1-0-2.hosting.eveve.co.nz/embed-iframe.js"></script>
```

The embed script scans for:

* `#eveve-booking`
* `.eveve-widget`
* `[data-eveve-widget]`

---

## 5 · Programmatic Initialisation (optional)  

```js
// Initialise one container added dynamically:
const el = document.createElement('div');
el.className = 'eveve-widget';
el.dataset.restaurant = 'TestNZB';
document.body.appendChild(el);
window.EveveWidget.init(el);

// Re-scan page for new widgets:
window.EveveWidget.initAll();
```

---

## 6 · Analytics Integration (GA4 / GTM)

The widget emits a booking success event with a structured payload:

Payload fields:
- `est`, `date`, `time`, `guests`, `area`, `currency`

Choose the snippet based on your embed method.

### A) Script Embed (auto analytics)

When you use our embed scripts (`embed-iframe.js` or `embed-inline.js`), booking events are automatically pushed to:
- GTM via `dataLayer.push({ event: 'eveve_booking_success', ... })`
- GA4 via `gtag('event', 'eveve_booking_success', ...)` (if `gtag` is present)

No extra code is required for standard tracking.

Optional: If you also want to run custom code, listen for the bubbled DOM event `eveve-booking-success`:

```html
<script>
  document.addEventListener('eveve-booking-success', function (e) {
    const p = e.detail || {};
    console.log('Booking success', p);
    // Your custom logic here
  });
</script>
```

Tip: Attach the listener to a specific container if you only want to scope to one widget.

### B) Direct Iframe Embed

The app posts messages to the parent window. Listen for `message` events with `type: 'booking-event'`:

```html
<script>
  const iframe = document.getElementById('eveve-booking-iframe');
  window.addEventListener('message', function (e) {
    if (!e || !e.data || typeof e.data !== 'object') return;
    if (e.source !== iframe.contentWindow) return;
    if (e.data.type === 'booking-event' && e.data.eventName === 'booking-success') {
      const p = e.data.detail || {};
      // GA4
      window.gtag && gtag('event', 'eveve_booking_success', p);
      // GTM
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({ event: 'eveve_booking_success', ...p });
    }
  });
</script>
```

Notes:
- GA/GTM tags must be present on the host page (outside the iframe).
- For iframe embeds, the message listener above is required for analytics.
- Scripted embeds (`embed-inline.js` or `embed-iframe.js`) automatically push standard booking events to GTM/GA4; no extra code needed.

---

## 6 · CMS-Specific Instructions  

The process is identical for every CMS: **paste the container HTML, then the script tag**.  
Below are quick notes for popular platforms:

| CMS / Builder | Where to paste code |
|---------------|---------------------|
| **WordPress** | Custom HTML block (Gutenberg or Classic) – or site-wide via *Insert Headers & Footers* plugin |
| **Squarespace** | *Code* block |
| **Wix** | *Embed HTML iframe* |
| **Shopify** | Custom HTML section, or add script once in `theme.liquid` before `</body>` |

Full step-by-step samples live under `public/embed-examples/`.

---

## 7 · Custom Themes & Styling  

1. Create a CSS file following the tokens in `/public/themes/`.  
2. Host it anywhere (your CDN or ours).  
3. Reference it with `data-theme-css`:

```html
<div class="eveve-widget" data-restaurant="TestNZB"
     data-theme="my-brand" data-theme-css="https://example.com/my-brand.css"></div>
```

---

## 8 · Troubleshooting  

| Symptom | Likely Cause | Fix |
|---------|--------------|-----|
| Widget doesn’t appear | Missing script tag or wrong path | Ensure script `src` is `https://form-1-0-2.hosting.eveve.co.nz/embed-inline.js` (inline) or `.../embed-iframe.js` (iframe). |
| “Error Loading Booking Widget” | Invalid `data-restaurant` ID | Verify your Eveve ID. |
| Unstyled widget | Theme CSS failed to load | Check `data-theme` exists or supply `data-theme-css`. |
| Payment error not visible | Cached old script | Hard-refresh or bust cache to load latest `embed-iframe.js`. |
| CORS error on assets | Cross-origin requests blocked | Ensure your asset host sends `Access-Control-Allow-Origin: *` on `/assets/*`. Inline loader uses `crossorigin="anonymous"`. |
| Console warning: "Permissions-Policy: payment is not allowed" (iframe) | Host page’s Permissions-Policy blocks Payment Request API | Use the scripted iframe embed (`embed-iframe.js`) which sets `allow="payment *"` and `allowpaymentrequest` automatically, or add those attributes to your manual `<iframe>`. If your site sets a restrictive `Permissions-Policy` response header, include `payment=(self "https://form-1-0-2.hosting.eveve.co.nz")`. |

---

## 9 · FAQ  

**Q:** Do I need to host any files?  
**A:** **No.** Everything lives on `form-1-0-2.hosting.eveve.co.nz`. Just one script tag.

**Q:** Can I self-host?  
**A:** Optional. You may self-host the built app and reference your own `embed-iframe.js`.  
Most users prefer the fully-hosted setup.

**Q:** Is the widget responsive?  
**A:** 100 %. It adapts to its parent container’s width.

**Q:** How do I test payments in dev?  
**A:** Use Stripe test cards; all errors show in the widget.

---

## 10 · Change Log (Embed Script)  

| Version | Date | Notes |
|---------|------|-------|
| 1.0.2   | 2025-09-28 | Switch to root-hosted domain and `embed-iframe.js`; smooth iframe auto-resize; booking analytics events. |

---

## 11 · Support  

Need help? Contact **support@eveve.com** with:

* the URL of the page containing the widget  
* the browser/OS used  
* (for payment issues) the exact error shown in the widget  

Happy booking! 🎉
