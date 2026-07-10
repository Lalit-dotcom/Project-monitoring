/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Theme-aware tokens mapped via CSS variables
        "surface": "var(--color-surface)",
        "surface-dim": "var(--color-color-surface-dim)",
        "surface-bright": "var(--color-surface-bright)",
        "surface-container-lowest": "var(--color-surface-container-lowest)",
        "surface-container-low": "var(--color-surface-container-low)",
        "surface-container": "var(--color-surface-container)",
        "surface-container-high": "var(--color-surface-container-high)",
        "surface-container-highest": "var(--color-surface-container-highest)",
        "on-surface": "var(--color-on-surface)",
        "on-surface-variant": "var(--color-on-surface-variant)",
        "inverse-surface": "var(--color-inverse-surface)",
        "inverse-on-surface": "var(--color-inverse-on-surface)",
        "outline": "var(--color-outline)",
        "outline-variant": "var(--color-outline-variant)",
        "surface-tint": "var(--color-surface-tint)",
        "primary": "var(--color-primary)",
        "on-primary": "var(--color-on-primary)",
        "primary-container": "var(--color-primary-container)",
        "on-primary-container": "var(--color-on-primary-container)",
        "inverse-primary": "var(--color-inverse-primary)",
        "secondary": "var(--color-secondary)",
        "on-secondary": "var(--color-on-secondary)",
        "secondary-container": "var(--color-secondary-container)",
        "on-secondary-container": "var(--color-on-secondary-container)",
        "tertiary": "var(--color-tertiary)",
        "on-tertiary": "var(--color-on-tertiary)",
        "tertiary-container": "var(--color-tertiary-container)",
        "on-tertiary-container": "var(--color-on-tertiary-container)",
        "error": "var(--color-error)",
        "on-error": "var(--color-on-error)",
        "error-container": "var(--color-error-container)",
        "on-error-container": "var(--color-on-error-container)",
        "primary-fixed": "var(--color-primary-fixed)",
        "primary-fixed-dim": "var(--color-primary-fixed-dim)",
        "on-primary-fixed": "var(--color-on-primary-fixed)",
        "on-primary-fixed-variant": "var(--color-on-primary-fixed-variant)",
        "secondary-fixed": "var(--color-secondary-fixed)",
        "secondary-fixed-dim": "var(--color-secondary-fixed-dim)",
        "on-secondary-fixed": "var(--color-on-secondary-fixed)",
        "on-secondary-fixed-variant": "var(--color-on-secondary-fixed-variant)",
        "tertiary-fixed": "var(--color-tertiary-fixed)",
        "tertiary-fixed-dim": "var(--color-tertiary-fixed-dim)",
        "on-tertiary-fixed": "var(--color-on-tertiary-fixed)",
        "on-tertiary-fixed-variant": "var(--color-on-tertiary-fixed-variant)",
        "background": "var(--color-background)",
        "on-background": "var(--color-on-background)",
        "surface-variant": "var(--color-surface-variant)",

        // Status Badge desaturated colors
        "status-success-bg": "var(--color-status-success-bg)",
        "status-success-text": "var(--color-status-success-text)",
        "status-success-border": "var(--color-status-success-border)",
        
        "status-warning-bg": "var(--color-status-warning-bg)",
        "status-warning-text": "var(--color-status-warning-text)",
        "status-warning-border": "var(--color-status-warning-border)",

        "status-neutral-bg": "var(--color-status-neutral-bg)",
        "status-neutral-text": "var(--color-status-neutral-text)",
        "status-neutral-border": "var(--color-status-neutral-border)",

        "status-error-bg": "var(--color-status-error-bg)",
        "status-error-text": "var(--color-status-error-text)",
        "status-error-border": "var(--color-status-error-border)",
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
