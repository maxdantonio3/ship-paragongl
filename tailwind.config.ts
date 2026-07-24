import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        manifest: {
          bg: "#F6F7F9",
          panel: "#FFFFFF",
          ink: "#152238",
          navy: {
            DEFAULT: "#152238",
            50: "#EEF1F5",
            100: "#D7DEE8",
            200: "#AEBDD1",
            400: "#4C617F",
            600: "#243450",
            700: "#1B2B44",
            800: "#152238",
            900: "#0E1626",
          },
          signal: {
            DEFAULT: "#E0862E",
            50: "#FDF3E7",
            100: "#FBE3C4",
            400: "#EA9D46",
            600: "#C96F1C",
          },
          line: "#E3E7ED",
        },
        status: {
          cold: "#5B7290",
          warm: "#E0862E",
          quoting: "#7A6FD0",
          customer: "#2E9E64",
        },
      },
      fontFamily: {
        display: ["var(--font-grotesk)", "system-ui", "sans-serif"],
        body: ["var(--font-inter)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      boxShadow: {
        panel: "0 1px 2px rgba(21,34,56,0.06), 0 1px 1px rgba(21,34,56,0.04)",
      },
      borderRadius: {
        md: "8px",
        lg: "12px",
      },
    },
  },
  plugins: [],
};
export default config;
