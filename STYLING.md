# STYLING.md

This app supports fully themeable styling using DaisyUI + Tailwind tokens, container‑scoped CSS variables, and URL‑driven selection. You can ship new customer themes as external CSS files without rebuilding the app.

## Overview

- Theme scope: The widget is wrapped and themed via:
  - Container: #eveve-widget
  - Attribute: data-theme="{theme-slug}"
- DaisyUI: Provides theme variable schema and semantic Tailwind utilities (e.g., g-base-100, 	ext-primary, order-base-300).
- URL selection: Theme is set per visit (no persistence) and applied before React mounts.
- External CSS: Optional 	hemeCss URL is injected at runtime so you can add/update themes without a rebuild.

## URL Parameters

- 	heme: sets the theme slug on the container.
  - Examples: ?theme=light, ?theme=dark, ?theme=brand-x
- 	hemeCss: URL (absolute or relative) to an external stylesheet defining CSS variables for your theme.
  - Examples:
    - CDN: ?theme=brand-x&themeCss=https://cdn.example.com/themes/brand-x.css
    - Local dev: ?theme=brand-dev&themeCss=/themes/brand-dev.css

Precedence on load:
1) 	heme → applied to #eveve-widget as data-theme
2) 	hemeCss (if present) → injected as a <link rel="stylesheet"> in <head>

Notes:
- Domains: All domains allowed (and relative URLs) by design in this project.
- The theming is container‑scoped and safe for embedding on other pages.

## Built-in Themes

DaisyUI provides light and dark as defaults. You can use them immediately:
- ...?theme=light
- ...?theme=dark

## Tokenized Styling in Components

All core components use DaisyUI/Tailwind tokens:
- Surfaces: g-base-100, g-base-200
- Borders: order-base-300
- Text: 	ext-base-content (+ opacity variants like /60, /70)
- Semantic colors: primary, success, warning, error, info
- Focus rings: ocus:ring-primary, etc.

This means changing CSS variables updates the whole UI without touching component code.

## External CSS Theme Contract

Your external CSS defines variables under a container-scoped selector. Use your theme slug in the selector to avoid leakage.

Selector format:
`
#eveve-widget[data-theme="YOUR-THEME-SLUG"] {
  /* define variables here */
}
`

Recommended variables (DaisyUI-compatible, HSL values without hsl() wrapper):
- Core palette
  - --p (primary), --s (secondary), --a (accent), --n (neutral)
  - --b1 (base-100), --b2 (base-200), --bc (base-content)
  - --in (info), --su (success), --wa (warning), --er (error)
- Shape/typography
  - --rounded-box, --rounded-btn
  - --font-sans (fallback stack recommended)
- Optional extras (if desired)
  - --border, --ring, --shadow-color

Example (brand-x.css):
`css
#eveve-widget[data-theme="brand-x"] {
  /* Colors (HSL components) */
  --p: 260 80% 56%;
  --s: 200 85% 54%;
  --a: 20 90% 55%;
  --n: 220 13% 18%;

  --b1: 0 0% 100%;
  --b2: 210 20% 98%;
  --bc: 222 14% 20%;

  --in: 207 90% 54%;
  --su: 142 71% 45%;
  --wa: 38 92% 50%;
  --er: 0 84% 60%;

  /* Radius / shadows / fonts */
  --rounded-box: 0.75rem;
  --rounded-btn: 0.5rem;
  --shadow-color: 220 13% 18%;
  --font-sans: Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji";
}
`

### HEX-friendly theme variables (simple option)

If you don’t want to calculate HSL triplets you can supply full HEX colors instead:

- `--p-color` – primary brand color (full value, e.g. `#3b82f6`)
- `--b2c` – base-200 surface/background (full value, e.g. `#f5f7fa`)

When present the widget prefers these over the HSL tokens (`--p`, `--b2`), falling back to the HSL values if they’re missing.

Example:

```css
#eveve-widget[data-theme="brand-sample"] {
  --p-color: #3b82f6; /* buttons, highlight, calendar circles */
  --b2c:     #f5f7fa; /* light surface */
}
```

## How to Create a New Style

Option A — External CDN (no rebuilds):
1) Create a CSS file like above (e.g., rand-ocean.css).
2) Host it at your CDN (any domain allowed).
3) Share a widget URL like:
   `
   https://your-host/index.html?theme=brand-ocean&themeCss=https://cdn.yourdomain.com/themes/brand-ocean.css
   `
4) Adjust variables over time; updates apply on next visit without rebuilding the app.

Option B — Local development (bundled server, still no rebuild to change theme file):
1) Add your CSS under public/themes/brand-local.css.
2) Start dev or build/preview as usual.
3) Use:
   `
   http://localhost:5173/?theme=brand-local&themeCss=/themes/brand-local.css
   `
4) Edit the CSS file; refresh to see changes.

Option C — Use built-in light/dark only (zero extra CSS):
- Use ?theme=light or ?theme=dark.

## Theming Tips

- Keep changes scoped: Only target #eveve-widget[data-theme="slug"] so nothing bleeds into the host page.
- Prefer HSL variables (DaisyUI uses HSL tokens).
- Start from light or dark in the app, then override with your external CSS for minimal work.
- If you need different radii, shadows, or fonts per brand, set --rounded-*, --shadow-color, --font-sans.

## React Calendar Styling

The calendar is themed by `src/components/calendar-override.css` (pure CSS, no styled-jsx).

- Circle-only hover: the square tile background is neutral; the day number (`abbr`) shows a circular hover/focus ring with primary tint for clear feedback.
- Stronger visual feedback: background alpha 0.30, border alpha 0.60, ring alpha 0.18 (can be tuned – see snippet below).
- Month label: larger (1.25 rem), bold, and rendered in the primary color so it matches the active-date circle.
- Larger fonts overall: nav arrows (1.125 rem), weekday headers (~0.9 rem), day numbers (1 rem).
- Token usage: `hsl(var(--p))`, `hsl(var(--bc))`, etc., **or** the hex variables `--p-color` / `--b2c` if you prefer HEX.
- Chrome-safe overlays: box-shadow uses a single fixed `rgba(59,130,246,0.18)` fallback to avoid `color-mix()` incompatibility.

**Customize hover strength**

Paste in your theme CSS and tweak alphas to your taste:

```css
/* stronger or softer calendar hover circle */
#eveve-widget[data-theme="brand-x"]
  .react-calendar-custom .react-calendar__tile:enabled:hover abbr,
#eveve-widget[data-theme="brand-x"]
  .react-calendar-custom .react-calendar__tile:enabled:focus abbr {
    background-color: hsl(var(--p, 220 90% 56%) / 0.40); /* adjust 0-1 */
    border: 1px solid hsl(var(--p, 220 90% 56%) / 0.70);
    box-shadow: 0 0 0 2px hsl(var(--p, 220 90% 56%) / 0.25);
}
```

## Testing Checklist

- Load with ?theme=light and ?theme=dark.
- Load with ?theme=brand-x&themeCss=... — confirm variables apply everywhere (buttons, borders, text, backgrounds, focus rings, calendar tiles).
- Confirm no FOUC: early script applies theme before React mounts.
- Embed scenario: ensure only the widget is themed (inspect host page for unintended changes).
- Toggle between two external CSS URLs to validate overrides.

## Troubleshooting

- Theme not applying:
  - Check the container selector matches your slug: #eveve-widget[data-theme="your-slug"].
  - Verify the 	heme param (exact slug).
  - Ensure 	hemeCss loads (DevTools → Network).
- Colors off: tune --bc and --b2 for contrast; set --border if you add it.
- If you see black/transparent colors and you supplied OKLCH triplets, remember `hsl()` expects **hue, saturation, lightness**. Either convert to HSL or just set `--p-color` / `--b2c` with HEX.
- CORS: enable public access for CSS files on your CDN.

## Security Note

This project intentionally allows any domain for 	hemeCss and accepts relative URLs for maximum flexibility. Only use trusted CSS sources in production environments.

## Brand “brand-roboto” Theme — How to Use and Customise

### Quick start

| Scenario | URL Example |
|---|---|
|Auto-load CSS from **/themes** folder|`?theme=brand-roboto`|
|Explicit CSS URL (local)|`?theme=brand-roboto&themeCss=/themes/brand-roboto.css`|
|Explicit CSS URL (CDN)|`?theme=brand-roboto&themeCss=https://cdn.example.com/brand-roboto.css`|

### What the theme does

* Dark-blue canvas (`--b1 / --b2`) with white text (`--bc`)
* Primary buttons are **white** with dark-blue text / border
* Time buttons default white; selected time turns **green**
* Accordion header hover uses a subtle lighter blue (maps to `hover:bg-base-300` via `--fallback-b3`)
* Inputs get white backgrounds & dark borders
* Calendar label/day-circle colours match the brand palette

### Core selector & variables

```css
#eveve-widget[data-theme="brand-roboto"] {
  /* Palette --------------------------------------------------------*/
  --p: 208 23% 22%;
  --b1: 208 23% 22%;
  --b2: 208 23% 28%;
  --b3: 208 23% 34%;      /* only used when wrapped with hsl() */
  --fallback-b3: #364554; /* lighter hover tint */
  --bc: 0 0% 100%;
  --pc: 208 23% 22%;      /* dark-blue text on white buttons */

  /* HEX shortcuts (optional) --------------------------------------*/
  --p-color: #2C3A46;
  --b2c:     #2C3A46;

  /* Typography ----------------------------------------------------*/
  --font-sans: 'Raleway', ui-sans-serif, system-ui, -apple-system,
               "Segoe UI", Helvetica, Arial;
}
```

### Primary button override (white buttons)

```css
#eveve-widget[data-theme="brand-roboto"] .btn-primary,
#eveve-widget[data-theme="brand-roboto"] .bg-primary,
#eveve-widget[data-theme="brand-roboto"] button.bg-primary {
  background:#fff !important;
  color:#2C3A46 !important;
  border:1px solid #2C3A46 !important;
}
#eveve-widget[data-theme="brand-roboto"] .btn-primary:disabled,
#eveve-widget[data-theme="brand-roboto"] button.bg-primary:disabled {
  opacity:1 !important;                 /* keep text readable */
}
#eveve-widget[data-theme="brand-roboto"] .bg-primary .text-primary-content  {color:#2C3A46 !important;}
#eveve-widget[data-theme="brand-roboto"] .bg-primary .text-primary-content\/70{color:rgba(44,58,70,.7)!important;}
```

### Time buttons & accordion hooks

Components expose stable hooks so a theme can target them without touching JSX:

* **Time buttons** – class `time-btn` + `data-selected="true|false"`
* **Accordion header** – class `accordion-toggle`

```css
#eveve-widget[data-theme="brand-roboto"] {
  --selected-time-bg:#22C55E;
  --selected-time-text:#fff;
  --selected-time-border:#1FAA53;
  --accordion-hover:#364554;
}

/* Selected time */
#eveve-widget[data-theme="brand-roboto"] .time-btn[data-selected="true"]{
  background:var(--selected-time-bg)!important;
  color:var(--selected-time-text)!important;
  border:1px solid var(--selected-time-border)!important;
}

/* Accordion hover */
#eveve-widget[data-theme="brand-roboto"] .accordion-toggle:hover{
  background:var(--accordion-hover)!important;
  border-color:var(--accordion-hover)!important;
}
```

### Calendar tweaks

```css
/* Month label */
#eveve-widget[data-theme="brand-roboto"]
  .react-calendar__navigation__label__labelText{color:#ffffff!important;}

/* Day circle hover/active */
#eveve-widget[data-theme="brand-roboto"]
  .react-calendar-custom .react-calendar__tile:enabled:hover abbr,
#eveve-widget[data-theme="brand-roboto"]
  .react-calendar-custom .react-calendar__tile:enabled:focus abbr,
#eveve-widget[data-theme="brand-roboto"]
  .react-calendar-custom .react-calendar__tile--active abbr{
    background:#fff!important;
    color:#2C3A46!important;
    border:1px solid #2C3A46!important;
}
```

### Changing the font

```css
/* 1. Import the font */
@import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap');

/* 2. Update variable */
#eveve-widget[data-theme="brand-roboto"]{
  --font-sans:'Roboto',ui-sans-serif,system-ui,-apple-system,"Segoe UI",Helvetica,Arial;
}
```

### Theme loader behaviour

* `?theme=brand-roboto` → auto-injects `${basePath}themes/brand-roboto.css`
* Add `&themeCss=` to override with any absolute/relative URL
* `basePath` is derived from current pathname so sub-folders work out of the box

### Troubleshooting (brand-roboto)

|Issue|Fix|
|---|---|
|Accordion hover not visible|Ensure `--fallback-b3` matches `--accordion-hover`|
|White button text unreadable|Check `.bg-primary .text-primary-content` overrides are present|
|Unexpected white text globally|Avoid broad span/label colour rules – scope to headings only|

### Adapting this theme for a new brand

1. Copy **public/themes/brand-roboto.css** → `brand-yourbrand.css`
2. Change selector to `#eveve-widget[data-theme="brand-yourbrand"]`
3. Swap colour tokens (`--p`, `--b1/2`, `--accordion-hover`, selected-time vars)
4. Update font import + `--font-sans`
5. Load with `?theme=brand-yourbrand` (add `&themeCss=` if you host the CSS elsewhere)