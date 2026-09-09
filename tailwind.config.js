/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./lib/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        rfcm: {
          red: "#C41E2B",
          "red-dark": "#9E1721",
          yellow: "#F4D35E",
          "yellow-soft": "#FBEDBB",
          charcoal: "#1C1A17",
          cream: "#FFFBF2",
          "cream-dark": "#FDF3DC",
        },
      },
      fontFamily: {
        serif: ["'Playfair Display'", "serif"],
        sans: ["'Inter'", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
