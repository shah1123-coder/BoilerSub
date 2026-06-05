import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./boilersub-frontend/src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          blue: "#0052d0",
          coral: "#0052d0",
          sand: "#fafaf8",
          ink: "#0f172a",
          mist: "#eaf1ff",
          gold: "#0052d0",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        panel: "0 18px 48px rgba(15, 23, 42, 0.1)",
      },
      backgroundImage: {
        "kinetic-grid":
          "linear-gradient(to right, rgba(0, 82, 208, 0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(0, 82, 208, 0.06) 1px, transparent 1px)",
      },
    },
  },
  plugins: [],
};
export default config;
