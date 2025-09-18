# Eveve Booking Widget – Embed Guide  
*Version 1.0.0*  

Welcome 👋 and thanks for choosing the Eveve booking widget!  
This guide shows **everything you need** to embed the widget on any website or CMS.

---

## 1. Overview  

The widget is delivered as a **self-contained JavaScript bundle** plus CSS.  
To embed it you only need two things:  

1. A container element (`<div>`) where the widget will live.  
2. One `<script>` tag that loads our embed script.  

The embed script automatically:

* injects the required CSS & JS
* initialises every container it finds
* supports multiple widgets per page
* works on any modern browser, CMS or page-builder

---

## 2. Quick Start (Basic Embed)  

```html
<!-- 1. Widget container -->
<div id="eveve-booking"
     data-restaurant="123"          <!-- ⭐ required -->
     data-theme="brand-roboto">     <!-- optional -->
</div>

<!-- 2. Embed script – load once per page, preferably just before </body> -->
<script src="https://YOUR_DOMAIN.com/form1-0-0/embed.js"></script>
```

That’s it – the widget will appear inside the div.

---

## 3. Container Attributes  

| Attribute              | Required | Description                                                                 |
|------------------------|----------|-----------------------------------------------------------------------------|
| `data-restaurant` / `data-est` | **Yes** | Your Eveve establishment ID.                                                |
| `data-theme`           | No       | Theme name (e.g. `brand-roboto`, `light`, `dark`). Defaults to **light**.   |
| `data-theme-css`       | No       | Absolute or relative URL of a custom CSS theme. If omitted, the script will load `/form1-0-0/themes/{theme}.css`. |
| `data-default-guests`  | No       | Pre-select guest count (number).                                            |
| `data-default-date`    | No       | Pre-select date (`YYYY-MM-DD`).                                             |
| `data-lang`            | No       | Language code (`en`, `es`, …). Defaults to **en**.                          |
| `data-debug`           | No       | `true` shows developer logs/debug panel.                                    |

You may use **either** `data-restaurant` **or** `data-est` – they’re interchangeable.

---

## 4. Multiple Widgets on the Same Page  

Just add more containers – the script initialises each one independently.

```html
<div class="eveve-widget" data-restaurant="123" data-theme="light"></div>
<div class="eveve-widget" data-restaurant="456" data-theme="brand-roboto" data-default-guests="4"></div>

<script src="https://YOUR_DOMAIN.com/form1-0-0/embed.js"></script>
```

The embed script scans for:

* `#eveve-booking`
* `.eveve-widget`
* `[data-eveve-widget]`

---

## 5. Programmatic Initialisation (optional)  

```js
// Initialise one container added dynamically:
const el = document.createElement('div');
el.dataset.restaurant = '123';
document.body.appendChild(el);
window.EveveWidget.init(el);

// Re-scan page for new widgets:
window.EveveWidget.initAll();
```

---

## 6. CMS-Specific Instructions  

### 6.1 WordPress (Gutenberg / Classic)  

1. Add a **Custom HTML** block where you want the widget.  
2. Paste the container div (see §2).  
3. Paste the script tag *immediately after* **or** add the script once globally:
   *Plugins → “Insert Headers & Footers” → Footer*.

### 6.2 Squarespace  

*Edit page → Add “Code” block → Paste container + script.*

### 6.3 Wix  

*Add **HTML iframe** element → “Enter Code” → Paste container + script.*

### 6.4 Shopify  

1. **Online Store → Themes → Edit code → theme.liquid**  
2. Add the script before `</body>`.  
3. In the page editor add a **Custom HTML** section with the container.

> Full step-by-step examples are included under `public/embed-examples/`.

---

## 7. Custom Themes & Styling  

1. Create a CSS file following the token examples in `/public/themes/`.  
2. Host it anywhere (same site or CDN).  
3. Reference it via `data-theme-css`:

```html
<div id="eveve-booking" data-restaurant="123"
     data-theme="my-custom" data-theme-css="/css/my-eveve-theme.css"></div>
```

---

## 8. Troubleshooting  

| Symptom | Likely Cause | Fix |
|---------|--------------|-----|
| Widget doesn’t appear | Missing script tag or wrong path | Verify **embed.js** URL is correct. |
| “Error Loading Booking Widget” | Invalid `data-restaurant` ID | Check your Eveve ID is correct. |
| CSS not applied / unstyled widget | Theme CSS failed to load | Confirm `data-theme` name exists or provide `data-theme-css`. |
| Multiple widgets overlap | Container divs inside flex/grid with limited width | Give widgets their own columns/rows or add `<br>` separators. |
| Payment error not visible | Using an **old embed.js** | Clear cache & ensure you serve **form1-0-0** build (>= Sep 2025). |

---

## 9. FAQ  

**Q:** Can I host the files myself?  
**A:** Yes. Copy the entire `/form1-0-0/` folder to your server and update the script `src` to your domain.

**Q:** Is the widget responsive?  
**A:** 100 %. It adapts to the width of its parent container.

**Q:** Can I localise the text?  
**A:** Pass `data-lang="es"` (for example). If a translation is missing it falls back to English.

**Q:** How do I test payments in dev?  
**A:** Use Stripe test keys and cards; the widget shows all error messages in development.

---

## 10. Change Log (Embed Script)  

| Version | Date | Notes |
|---------|------|-------|
| 1.0.0   | 2025-09-18 | Initial public release. Supports multiple widgets, themes, full error display. |

---

## 11. Support  

Need help? Contact **support@eveve.com** with:

* the URL of the page containing the widget  
* the browser/OS used  
* (for payment issues) the exact error shown in the widget  

Happy booking! 🎉
