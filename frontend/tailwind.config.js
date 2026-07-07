/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // DESIGN.md official tokens
        "surface": "#f8f9fa",
        "surface-dim": "#d9dadb",
        "surface-bright": "#f8f9fa",
        "surface-container-lowest": "#ffffff",
        "surface-container-low": "#f3f4f5",
        "surface-container": "#edeeef",
        "surface-container-high": "#e7e8e9",
        "surface-container-highest": "#e1e3e4",
        "on-surface": "#191c1d",
        "on-surface-variant": "#3d4947",
        "inverse-surface": "#2e3132",
        "inverse-on-surface": "#f0f1f2",
        "outline": "#6d7a77",
        "outline-variant": "#bcc9c6",
        "surface-tint": "#006a61",
        "primary": "#00685f", // primary deep teal
        "on-primary": "#ffffff",
        "primary-container": "#008378",
        "on-primary-container": "#f4fffc",
        "inverse-primary": "#6bd8cb",
        "secondary": "#575e70",
        "on-secondary": "#ffffff",
        "secondary-container": "#d9dff5",
        "on-secondary-container": "#5c6274",
        "tertiary": "#555c6a",
        "on-tertiary": "#ffffff",
        "tertiary-container": "#6e7583",
        "on-tertiary-container": "#fefcff",
        "error": "#ba1a1a",
        "on-error": "#ffffff",
        "error-container": "#ffdad6",
        "on-error-container": "#93000a",
        "primary-fixed": "#89f5e7",
        "primary-fixed-dim": "#6bd8cb",
        "on-primary-fixed": "#00201d",
        "on-primary-fixed-variant": "#005049",
        "secondary-fixed": "#dce2f7",
        "secondary-fixed-dim": "#c0c6db",
        "on-secondary-fixed": "#141b2b",
        "on-secondary-fixed-variant": "#404758",
        "tertiary-fixed": "#dce2f3",
        "tertiary-fixed-dim": "#c0c7d6",
        "on-tertiary-fixed": "#151c27",
        "on-tertiary-fixed-variant": "#404754",
        "background": "#f8f9fa",
        "on-background": "#191c1d",
        "surface-variant": "#e1e3e4"
      },
      borderRadius: {
        "sm": "0.25rem",          // 4px
        "DEFAULT": "0.5rem",     // 8px
        "md": "0.75rem",         // 12px
        "lg": "1rem",            // 16px
        "xl": "1.5rem",          // 24px
        "full": "9999px"
      },
      spacing: {
        "unit": "4px",
        "container-max": "1280px",
        "gutter": "24px",
        "margin-mobile": "16px",
        "margin-desktop": "32px",
        "stack-sm": "8px",
        "stack-md": "16px",
        "stack-lg": "24px",
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
        headline: ["Geist", "sans-serif"],
      },
    },
  },
  plugins: [],
}
