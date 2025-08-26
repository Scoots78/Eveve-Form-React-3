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

The calendar is styled with DaisyUI tokens via src/components/calendar-override.css and the eact-calendar defaults.
- Container class: eact-calendar-custom.
- Uses hsl(var(--b1)), hsl(var(--b2)), hsl(var(--bc)), and hsl(var(--p)) for consistent theming.
- No styled-jsx; pure CSS to ensure styles load in Vite builds.

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
- CORS: enable public access for CSS files on your CDN.

## Security Note

This project intentionally allows any domain for 	hemeCss and accepts relative URLs for maximum flexibility. Only use trusted CSS sources in production environments.