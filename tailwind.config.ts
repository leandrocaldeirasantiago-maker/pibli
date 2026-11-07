import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        marinho: {
          DEFAULT: "#142C4D",
          50: "#EEF2F8",
          100: "#D5DEEC",
          200: "#A9BBD6",
          300: "#7C97C0",
          400: "#4F72A5",
          500: "#2F5183",
          600: "#223F69",
          700: "#1A345A",
          800: "#142C4D",
          900: "#0B1A30",
        },
        dourado: {
          DEFAULT: "#D5AD60",
          50: "#FBF6EC",
          100: "#F4E8CC",
          200: "#EAD39F",
          300: "#DFC07E",
          400: "#D5AD60",
          500: "#C0933F",
          600: "#9C752F",
        },
        background: "var(--background)",
        foreground: "var(--foreground)",
        card: "var(--card)",
        muted: "var(--muted)",
        "muted-foreground": "var(--muted-foreground)",
        border: "var(--border)",
        primary: "var(--primary)",
        "primary-foreground": "var(--primary-foreground)",
        sidebar: "var(--sidebar)",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        serif: ["var(--font-serif)", "Georgia", "serif"],
      },
      borderRadius: { xl: "0.9rem", "2xl": "1.2rem" },
      boxShadow: {
        card: "0 1px 2px rgba(20,44,77,0.06), 0 4px 16px rgba(20,44,77,0.06)",
      },
    },
  },
  plugins: [],
};

export default config;
