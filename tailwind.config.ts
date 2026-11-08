import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        garden: {
          leaf: "#2f8f4e",
          grass: "#57c977",
          sky: "#dff3ff",
          sun: "#ffcf3f",
          petal: "#ff7aa8",
          soil: "#6b4b2b",
          ink: "#1f3a2b",
        },
      },
      fontFamily: {
        rounded: ["var(--font-rounded)", "ui-rounded", "system-ui", "sans-serif"],
      },
      borderRadius: {
        bubble: "1.5rem",
      },
    },
  },
  plugins: [],
};

export default config;
