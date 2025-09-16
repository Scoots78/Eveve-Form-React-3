/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {},
  },
  daisyui: {
    themes: ["light", "dark"],
    darkTheme: "dark",
  },
  plugins: [
    // DaisyUI plugin provides theme utilities (bg-primary, text-error, etc.)
    require("daisyui"),
  ],
}
