# Eveve Widget Theme System

This document describes the comprehensive DaisyUI theme system for the Eveve booking widget, supporting all 35 built-in DaisyUI themes.

## Overview

The Eveve widget now supports all 35 built-in DaisyUI themes, providing extensive customization options for restaurants while maintaining the same simple embed process described in [`EMBED_GUIDE.md`](../public/EMBED_GUIDE.md).

## Supported Themes

### All 35 DaisyUI Themes Available

| Theme | Category | Description |
|-------|----------|-------------|
| `light` | Basic | Clean light theme (default) |
| `dark` | Basic | Clean dark theme |
| `cupcake` | Colorful | Sweet pastel pink theme |
| `bumblebee` | Colorful | Bright yellow and black theme |
| `emerald` | Colorful | Fresh green theme |
| `corporate` | Corporate | Professional blue theme |
| `synthwave` | Dark | Neon purple retro theme |
| `retro` | Retro | Vintage brown and orange theme |
| `cyberpunk` | Dark | Futuristic neon yellow theme |
| `valentine` | Colorful | Romantic pink theme |
| `halloween` | Dark | Spooky orange and purple theme |
| `garden` | Colorful | Natural green theme |
| `forest` | Colorful | Deep forest green theme |
| `aqua` | Colorful | Ocean blue theme |
| `lofi` | Retro | Muted brown and beige theme |
| `pastel` | Colorful | Soft rainbow pastel theme |
| `fantasy` | Colorful | Magical purple theme |
| `wireframe` | Corporate | Minimal black and white theme |
| `black` | Dark | Pure black theme |
| `luxury` | Dark | Elegant gold and black theme |
| `dracula` | Dark | Vampire-inspired purple theme |
| `cmyk` | Special | Print colors theme |
| `autumn` | Retro | Warm fall colors theme |
| `business` | Corporate | Professional grey theme |
| `acid` | Special | Bright neon green theme |
| `lemonade` | Colorful | Fresh yellow theme |
| `night` | Dark | Deep blue night theme |
| `coffee` | Dark | Rich brown theme |
| `winter` | Retro | Cool blue and white theme |
| `dim` | Dark | Muted dark theme |
| `nord` | Retro | Nordic blue theme |
| `sunset` | Retro | Warm orange and pink theme |

## Usage

### URL Parameter (Recommended)

The most common way to set themes for embedded widgets:

```html
<!-- Light theme -->
<iframe src="https://form-1-0-2.hosting.eveve.co.nz/?est=TestNZA&theme=light"></iframe>

<!-- Dark theme -->  
<iframe src="https://form-1-0-2.hosting.eveve.co.nz/?est=TestNZA&theme=dark"></iframe>

<!-- Corporate theme -->
<iframe src="https://form-1-0-2.hosting.eveve.co.nz/?est=TestNZA&theme=corporate"></iframe>

<!-- Halloween theme -->
<iframe src="https://form-1-0-2.hosting.eveve.co.nz/?est=TestNZA&theme=halloween"></iframe>
```

### Data Attribute

For scripted embeds, use the `data-theme` attribute:

```html
<div class="eveve-widget" 
     data-restaurant="TestNZA" 
     data-theme="synthwave">
</div>
<script src="https://form-1-0-2.hosting.eveve.co.nz/embed-iframe.js"></script>
```

### Theme Priority

The theme system uses this priority order:

1. **URL parameter** (`?theme=dark`)
2. **Data attribute** (`data-theme="dark"`)  
3. **Default fallback** (`light`)

## Implementation Details

### Theme Validation

All themes are validated against the official DaisyUI theme list. Invalid themes automatically fall back to `light` with a console warning.

### Theme Utilities

The new `src/utils/themeUtils.js` provides:

```javascript
import { 
  DAISY_THEMES,     // Array of all valid theme names
  isValidTheme,     // Validate a theme name
  getTheme,         // Get current theme from URL/DOM
  applyTheme,       // Apply theme to widget container
  getThemeCategories // Get themes organized by category
} from './utils/themeUtils';

// Example usage
const currentTheme = getTheme('corporate'); // fallback to 'corporate'
if (isValidTheme('synthwave')) {
  applyTheme('synthwave');
}
```

### Build Configuration

All themes are included in the Tailwind build via `tailwind.config.js`:

```javascript
daisyui: {
  themes: [
    "light", "dark", "cupcake", "bumblebee", "emerald", "corporate",
    "synthwave", "retro", "cyberpunk", "valentine", "halloween", "garden",
    "forest", "aqua", "lofi", "pastel", "fantasy", "wireframe", "black",
    "luxury", "dracula", "cmyk", "autumn", "business", "acid", "lemonade",
    "night", "coffee", "winter", "dim", "nord", "sunset"
  ],
  darkTheme: "dark",
}
```

## Theme Categories

Themes are organized into categories for easier selection:

### Basic Themes
Best for most use cases
- `light` - Clean, professional
- `dark` - Modern dark mode

### Corporate Themes  
Professional business appearance
- `corporate` - Professional blue
- `business` - Conservative grey
- `wireframe` - Minimal black/white

### Colorful Themes
Vibrant and welcoming
- `cupcake` - Sweet pink
- `emerald` - Fresh green  
- `garden` - Natural green
- `valentine` - Romantic pink
- `lemonade` - Fresh yellow

### Dark Themes
For sophisticated or evening atmospheres
- `synthwave` - Neon purple retro
- `cyberpunk` - Futuristic yellow
- `halloween` - Spooky orange/purple
- `luxury` - Elegant gold/black
- `dracula` - Vampire purple
- `night` - Deep blue
- `coffee` - Rich brown

### Retro Themes
Nostalgic and vintage feels
- `retro` - Brown and orange
- `lofi` - Muted earth tones
- `autumn` - Warm fall colors
- `winter` - Cool blue/white
- `nord` - Nordic minimalism
- `sunset` - Warm orange/pink

## Best Practices

### Theme Selection for Restaurants

**Fine Dining**: `luxury`, `dark`, `corporate`, `business`
**Casual Dining**: `light`, `emerald`, `garden`, `pastel`
**Cafes**: `coffee`, `lemonade`, `cupcake`, `lofi`
**Bars/Nightlife**: `synthwave`, `cyberpunk`, `dracula`, `night`
**Seasonal**: `halloween`, `valentine`, `autumn`, `winter`

### Performance

- All themes are included in the single CSS bundle
- No additional HTTP requests for theme switching
- Themes are applied via CSS custom properties (CSS variables)
- Build size impact: ~115KB total CSS (includes all themes)

### Browser Support

DaisyUI themes work in all modern browsers that support CSS custom properties:
- Chrome 49+
- Firefox 31+  
- Safari 9.1+
- Edge 16+

## Custom Themes

For restaurants requiring brand-specific themes beyond the 35 built-in options:

1. Use the `themeCss` parameter for external CSS:
   ```html
   <iframe src="https://form-1-0-2.hosting.eveve.co.nz/?est=TestNZA&theme=custom&themeCss=https://example.com/custom-theme.css"></iframe>
   ```

2. Follow DaisyUI's custom theme format using CSS custom properties
3. Reference existing themes in `public/themes/` for structure

## Testing Themes

Test any theme locally:
```
http://localhost:5173/?est=TestNZA&theme=THEME_NAME
```

Examples:
- http://localhost:5173/?est=TestNZA&theme=synthwave
- http://localhost:5173/?est=TestNZA&theme=corporate  
- http://localhost:5173/?est=TestNZA&theme=halloween

## Migration

### From Previous Version

Existing embeds continue to work without changes:
- Default `light` theme applied if no theme specified
- Custom themes via `themeCss` parameter still supported
- All embed methods (iframe, inline, scripted) work unchanged

### Breaking Changes

None. This is a backward-compatible enhancement.

## Support

For theme-related questions:
- Check the [DaisyUI themes documentation](https://daisyui.com/docs/themes/)
- Review this document and [`EMBED_GUIDE.md`](../public/EMBED_GUIDE.md)
- Contact support@eveve.com with specific theme requests