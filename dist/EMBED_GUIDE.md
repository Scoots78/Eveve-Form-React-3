# Eveve Booking Widget – Embed Guide  
*Version 1.0.0*  

Welcome 👋 and thanks for choosing the Eveve booking widget!  
This guide shows **everything you need** to embed the widget on any website or CMS.

---

## 1 · Why It’s Easy  

The widget is a **fully-hosted**, self-contained application served from  
`https://booking.eveve.com/form1-0-0/`.  

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

## 2 · Quick Start (Basic Embed)  

```html
<!-- 1. Widget container -->
<div id="eveve-booking"
     data-restaurant="123"          <!-- ⭐ required -->
     data-theme="brand-roboto">     <!-- optional -->
</div>

<!-- 2. ONE script tag – load once per page, ideally before </body> -->
<script src="https://booking.eveve.com/form1-0-0/embed.js"></script>
```

That’s it – the widget appears inside the div.  
Zero install. Zero assets hosted on your side.

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

<script src="https://booking.eveve.com/form1-0-0/embed.js"></script>
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
| Widget doesn’t appear | Missing script tag or wrong path | Ensure script `src` is `https://booking.eveve.com/form1-0-0/embed.js`. |
| “Error Loading Booking Widget” | Invalid `data-restaurant` ID | Verify your Eveve ID. |
| Unstyled widget | Theme CSS failed to load | Check `data-theme` exists or supply `data-theme-css`. |
| Payment error not visible | Cached old script | Hard-refresh or bust cache to load latest embed.js. |

---

## 9 · FAQ  

**Q:** Do I need to host any files?  
**A:** **No.** Everything lives on `book.eveve.com`. Just one script tag.

**Q:** Can I self-host?  
**A:** Optional. Copy `/form1-0-0/` to your own server and change the script `src`.  
Most users prefer the fully-hosted setup.

**Q:** Is the widget responsive?  
**A:** 100 %. It adapts to its parent container’s width.

**Q:** How do I test payments in dev?  
**A:** Use Stripe test cards; all errors show in the widget.

---

## 10 · Change Log (Embed Script)  

| Version | Date | Notes |
|---------|------|-------|
| 1.0.0   | 2025-09-18 | Initial public release. Fully hosted, zero-install, multiple widgets, full error display. |

---

## 11 · Support  

Need help? Contact **support@eveve.com** with:

* the URL of the page containing the widget  
* the browser/OS used  
* (for payment issues) the exact error shown in the widget  

Happy booking! 🎉
