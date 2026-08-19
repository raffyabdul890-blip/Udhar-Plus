import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
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
        brand: {
          red: "#DA0000", // Primary actions / CTAs; also "Udhar" (given) coding
          black: "#000000", // Main app background
          white: "#FFFFFF", // High-contrast text
          charcoal: "#574D4C", // Card backgrounds & borders
          darkred: "#830F10", // Pressed state / AI highlights
          green: "#22C55E", // "Jama" (received) coding, receivable/payable totals — 9.2:1 on black
          darkgreen: "#15803D", // Pressed state for green actions
        },
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
      backgroundImage: {
        "shimmer-gradient":
          "linear-gradient(90deg, #574D4C 0%, #6b6060 20%, #574D4C 40%, #574D4C 100%)",
        "glow-red":
          "radial-gradient(circle, rgba(218,0,0,0.6) 0%, rgba(218,0,0,0) 70%)",
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
          "0%": { transform: "scale(0)", opacity: "0.4" },
          "100%": { transform: "scale(4)", opacity: "0" },
        },
        glow: {
          "0%, 100%": { boxShadow: "0 0 0px rgba(218,0,0,0)" },
          "50%": { boxShadow: "0 0 16px rgba(218,0,0,0.6)" },
        },
      },
      animation: {
        shimmer: "shimmer 2s linear infinite",
        ripple: "ripple 450ms ease-out",
        glow: "glow 2.2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
