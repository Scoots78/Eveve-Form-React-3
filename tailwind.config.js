/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      fontSize: {
        'xs': '0.85rem',    // 12px - make smaller
        'sm': '0.9rem',   // 14px - keep default
        'base': '1.1rem', // 18px - increase base size
        'lg': '1.15rem',    // 20px - keep default
        // Or add custom sizes
        'body': '1rem',   // Custom body size
        'caption': '0.8rem' // Custom caption size
      }

    },
  },
  daisyui: {
    themes: [
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
    ],
    darkTheme: "dark",
  },
  plugins: [
    // DaisyUI plugin provides theme utilities (bg-primary, text-error, etc.)
    require("daisyui"),
  ],
}
