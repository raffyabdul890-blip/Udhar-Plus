import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["selector", '[data-theme="dark"]'],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "var(--font-inter)",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
      },
      colors: {
        // Every value is a CSS custom property (see app/globals.css) so the
        // whole app re-themes when <html data-theme> flips — no component
        // needs a dark: variant. Deliberately a different token prefix (no
        // "brand") so a leftover old class from either retired theme is easy
        // to grep for.
        canvas: "var(--color-canvas)", // App background
        surface: "var(--color-surface)", // Card / modal background
        "surface-alt": "var(--color-surface-alt)", // Secondary surface, hover/pressed backgrounds
        "surface-dim": "var(--color-surface-dim)", // Skeleton/shimmer base
        border: "var(--color-border)", // Default hairline border
        "border-strong": "var(--color-border-strong)",
        ink: "var(--color-ink)", // Primary text
        "ink-secondary": "var(--color-ink-secondary)", // Secondary text
        "ink-tertiary": "var(--color-ink-tertiary)", // Placeholder / disabled text
        primary: "var(--color-primary)", // Brand ocean blue — nav, links, secondary actions
        "primary-dark": "var(--color-primary-dark)", // Pressed state
        "primary-light": "var(--color-primary-light)", // Soft tinted background (badges, secondary buttons)
        accent: "var(--color-accent)", // Secondary purple-blue accent (Bank & Wallet, Add Customer)
        "accent-dark": "var(--color-accent-dark)",
        "accent-light": "var(--color-accent-light)",
        success: "var(--color-success)", // Positive financial actions (Cash In, Receive Payment)
        "success-dark": "var(--color-success-dark)",
        "success-light": "var(--color-success-light)",
        danger: "var(--color-danger)", // Negative financial actions (Give Udhaar, Cash Out) — used carefully
        "danger-dark": "var(--color-danger-dark)",
        "danger-light": "var(--color-danger-light)",
        warning: "var(--color-warning)",
        "warning-light": "var(--color-warning-light)",
      },
      spacing: {
        tap: "48px", // Minimum accessible touch target (see FRONTEND_UI.md)
      },
      minHeight: {
        tap: "48px",
      },
      minWidth: {
        tap: "48px",
      },
      fontSize: {
        "senior-xs": ["0.875rem", { lineHeight: "1.5" }],
        "senior-sm": ["1rem", { lineHeight: "1.6" }],
        "senior-base": ["1.125rem", { lineHeight: "1.65" }],
        "senior-lg": ["1.375rem", { lineHeight: "1.6" }],
        "senior-xl": ["1.75rem", { lineHeight: "1.5" }],
        "senior-2xl": ["2.25rem", { lineHeight: "1.35" }],
        "senior-3xl": ["3rem", { lineHeight: "1.2" }],
      },
      boxShadow: {
        card: "0 1px 2px rgba(var(--shadow-color),0.04), 0 1px 3px rgba(var(--shadow-color),0.06)",
        elevated: "0 8px 24px rgba(var(--shadow-color),0.10), 0 2px 6px rgba(var(--shadow-color),0.06)",
        "focus-ring": "0 0 0 3px rgba(3,105,161,0.35)",
      },
      backgroundImage: {
        "shimmer-gradient":
          "linear-gradient(90deg, var(--color-surface-dim) 0%, var(--color-canvas) 20%, var(--color-surface-dim) 40%, var(--color-surface-dim) 100%)",
      },
      backgroundSize: {
        shimmer: "1000px 100%",
      },
      keyframes: {
        shimmer: {
          "0%": { backgroundPosition: "-1000px 0" },
          "100%": { backgroundPosition: "1000px 0" },
        },
        ripple: {
          "0%": { transform: "scale(0)", opacity: "0.35" },
          "100%": { transform: "scale(4)", opacity: "0" },
        },
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "scale-in": {
          "0%": { opacity: "0", transform: "scale(0.96)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        "slide-up-sheet": {
          "0%": { transform: "translateY(100%)" },
          "100%": { transform: "translateY(0)" },
        },
        "toast-in": {
          "0%": { opacity: "0", transform: "translateY(12px) scale(0.98)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        "value-pop": {
          "0%": { transform: "scale(1)" },
          "40%": { transform: "scale(1.06)" },
          "100%": { transform: "scale(1)" },
        },
      },
      animation: {
        shimmer: "shimmer 2s linear infinite",
        ripple: "ripple 500ms ease-out",
        "fade-in-up": "fade-in-up 220ms ease-out both",
        "scale-in": "scale-in 180ms ease-out both",
        "slide-up-sheet": "slide-up-sheet 220ms cubic-bezier(0.2, 0, 0, 1) both",
        "toast-in": "toast-in 200ms ease-out both",
        "value-pop": "value-pop 320ms ease-out",
      },
    },
  },
  plugins: [],
};

export default config;
