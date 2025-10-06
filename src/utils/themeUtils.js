/**
 * DaisyUI Theme Utilities
 * Provides centralized theme management for the Eveve booking widget
 */

// All 35 built-in DaisyUI themes
export const DAISY_THEMES = [
  "light",
  "dark", 
  "cupcake",
  "bumblebee",
  "emerald", 
  "corporate",
  "synthwave",
  "retro",
  "cyberpunk",
  "valentine",
  "halloween",
  "garden",
  "forest",
  "aqua",
  "lofi",
  "pastel", 
  "fantasy",
  "wireframe",
  "black",
  "luxury",
  "dracula",
  "cmyk",
  "autumn",
  "business",
  "acid",
  "lemonade",
  "night",
  "coffee",
  "winter",
  "dim",
  "nord",
  "sunset"
];

/**
 * Check if a theme name is a valid DaisyUI theme
 * @param {string} theme - Theme name to validate
 * @returns {boolean} - True if theme is valid
 */
export function isValidTheme(theme) {
  return DAISY_THEMES.includes(theme);
}

/**
 * Get the theme from URL parameters, data attributes, or default
 * Priority: URL param > data-theme attribute > default
 * @param {string} defaultTheme - Fallback theme (default: 'light')
 * @returns {string} - Valid theme name
 */
export function getTheme(defaultTheme = 'light') {
  // Check URL parameter first
  const urlParams = new URLSearchParams(window.location.search);
  const urlTheme = urlParams.get('theme');
  
  if (urlTheme && isValidTheme(urlTheme)) {
    return urlTheme;
  }
  
  // Check data-theme attribute on widget container
  const widget = document.getElementById('eveve-widget');
  if (widget) {
    const dataTheme = widget.getAttribute('data-theme');
    if (dataTheme && isValidTheme(dataTheme)) {
      return dataTheme;
    }
  }
  
  // Fallback to default theme if valid, otherwise 'light'
  return isValidTheme(defaultTheme) ? defaultTheme : 'light';
}

/**
 * Apply theme to the widget container
 * @param {string} theme - Theme name to apply
 * @returns {boolean} - True if theme was applied successfully
 */
export function applyTheme(theme) {
  if (!isValidTheme(theme)) {
    console.warn(`[themeUtils] Invalid theme: ${theme}. Using 'light' as fallback.`);
    theme = 'light';
  }
  
  const widget = document.getElementById('eveve-widget');
  if (widget) {
    widget.setAttribute('data-theme', theme);
    return true;
  }
  
  console.error('[themeUtils] Widget container #eveve-widget not found');
  return false;
}

/**
 * Get theme categories for easier organization
 * @returns {Object} - Themes organized by category
 */
export function getThemeCategories() {
  return {
    basic: ['light', 'dark'],
    corporate: ['corporate', 'business', 'wireframe'],
    colorful: ['cupcake', 'bumblebee', 'emerald', 'valentine', 'garden', 'forest', 'aqua', 'pastel', 'fantasy', 'lemonade'],
    dark: ['dark', 'synthwave', 'halloween', 'dracula', 'night', 'coffee', 'black', 'luxury', 'dim'],
    retro: ['retro', 'cyberpunk', 'lofi', 'autumn', 'winter', 'nord', 'sunset'],
    special: ['acid', 'cmyk']
  };
}