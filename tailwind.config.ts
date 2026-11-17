import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        kria: {
          950: "#070B14",
          900: "#0B0F19",
          850: "#101626",
          800: "#161F36",
          700: "#1E2C4D",
          600: "#2B3D66",
          500: "#3E578F",
          border: "#1F2B48",
          card: "#0D1322",
          surface: "#121A2E",
          hover: "#1A2540",
        },
        electric: {
          DEFAULT: "#2563EB",
          glow: "#38BDF8",
          light: "#60A5FA",
          dark: "#1D4ED8",
        },
      },
      boxShadow: {
        glow: "0 0 20px -5px rgba(37, 99, 235, 0.3)",
        card: "0 4px 20px -2px rgba(0, 0, 0, 0.4)",
      },
    },
  },
  plugins: [],
};
export default config;
