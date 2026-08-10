import path from "path";
import { fileURLToPath } from "url";

const here = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('tailwindcss').Config} */
export default {
  content: [path.join(here, "index.html"), path.join(here, "src/**/*.{ts,tsx}")],
  theme: {
    extend: {
      fontFamily: { sans: ["Poppins", "system-ui", "sans-serif"] },
      colors: {
        ink: "#0F0F0F", body: "#4A4A4A", "bg-soft": "#F6F6F7", borderc: "#E8E8EA",
        "candy-pink": "#FF5FA2", "candy-pink-100": "#FFE3EF", jungle: "#2E7D4F",
        lavender: "#9B84E8", gold: "#F2C14E", "gold-deep": "#8A6A12",
      },
      boxShadow: { soft: "0 8px 30px rgba(0,0,0,0.06)" },
      borderRadius: { card: "24px", smcard: "16px" },
    },
  },
  plugins: [],
};
