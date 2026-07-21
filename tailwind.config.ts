import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Paragon brand — matched from Nexus portal
        navy: {
          DEFAULT: "#0d1b2e",
          light:   "#112240",
          muted:   "#1e3a5f",
        },
        blue: {
          DEFAULT: "#1a4fa0",
          light:   "#2360bf",
          sky:     "#4d9fff",
        },
        orange: {
          DEFAULT: "#e07b2b",
          light:   "#f0903a",
        },
        // UI neutrals
        surface: "#f7f8fc",
        border:  "#e2e8f0",
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
