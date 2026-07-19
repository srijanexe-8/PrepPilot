/** @type {import('tailwindcss').Config} */

// Every colour below resolves to a CSS variable holding "R G B" channels, so a
// single `.dark` block in index.css re-skins the entire app — including
// hover/focus variants and opacity modifiers (`bg-emerald-50/40`) — without
// touching a single className. Light-mode values are the stock Tailwind
// palette, so light mode renders exactly as it did before.
const ramp = (name, shades) =>
  Object.fromEntries(
    shades.map((s) => [s, `rgb(var(--c-${name}-${s}) / <alpha-value>)`])
  );

export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        fraunces: ['Fraunces', 'serif'],
      },
      colors: {
        gray: ramp('gray', [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950]),
        emerald: ramp('emerald', [50, 100, 200, 300, 400, 500, 600, 700, 800, 900]),
        green: ramp('green', [300, 400, 500, 800, 900]),
        amber: ramp('amber', [50, 200, 400, 500, 600, 700, 800, 900]),
        red: ramp('red', [50, 100, 200, 300, 400, 500, 600, 700, 800, 900]),
        rose: ramp('rose', [50, 200, 400, 500, 600, 700]),
        indigo: ramp('indigo', [50, 200, 500, 600, 700]),
        violet: ramp('violet', [50, 100, 200, 500, 600, 700, 900]),
        blue: ramp('blue', [50, 200, 500, 700]),
        teal: ramp('teal', [50, 400, 500]),
        orange: ramp('orange', [500, 600]),
        yellow: ramp('yellow', [400]),
      },
    },
  },
  plugins: [],
}
