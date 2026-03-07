/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        midnight: "#0f172a",
        ink: "#111827",
        horizon: "#1e293b",
        accent: "#38bdf8",
        sand: "#e2e8f0",
      },
    },
  },
  plugins: [],
};
