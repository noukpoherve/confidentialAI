/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./*.html",
    "./src/**/*.js",
  ],
  theme: {
    extend: {
      animation: {
        "orb-pulse": "orb-pulse 2.5s ease-in-out infinite",
      },
      keyframes: {
        "orb-pulse": {
          "0%, 100%": { opacity: "0.4", transform: "scale(1)" },
          "50%": { opacity: "0", transform: "scale(1.55)" },
        },
      },
    },
  },
  plugins: [],
};
