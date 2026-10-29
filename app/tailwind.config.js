/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Tokens in src/index.css, with opacity support: bg-accent/10
        canvas: "rgb(var(--canvas) / <alpha-value>)",
        surface: "rgb(var(--surface) / <alpha-value>)",
        sunken: "rgb(var(--sunken) / <alpha-value>)",
        line: "rgb(var(--line) / <alpha-value>)",
        ink: "rgb(var(--ink) / <alpha-value>)",
        onink: "rgb(var(--on-ink) / <alpha-value>)",
        muted: "rgb(var(--muted) / <alpha-value>)",
        accent: "rgb(var(--accent) / <alpha-value>)",
        onaccent: "rgb(var(--on-accent) / <alpha-value>)",
        pistache: "rgb(var(--pistache) / <alpha-value>)",
        danger: "rgb(var(--danger) / <alpha-value>)",
        // Pop look: colour blocks
        sun: "rgb(var(--sun) / <alpha-value>)",
        mint: "rgb(var(--mint) / <alpha-value>)",
        lilac: "rgb(var(--lilac) / <alpha-value>)",
        lemon: "rgb(var(--lemon) / <alpha-value>)",
      },
      fontFamily: {
        // Set per look in src/index.css
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        soft: "0 1px 2px rgb(28 25 23 / 0.04), 0 8px 24px -8px rgb(28 25 23 / 0.10)",
        // Pop look: a sticker's hard shadow
        pop: "0 4px 0 rgb(var(--ink))",
        "pop-sm": "0 2px 0 rgb(var(--ink))",
      },
    },
  },
  plugins: [
    // pop:… applies only in the pop look (html[data-style="pop"])
    ({ addVariant }) => addVariant("pop", ':is([data-style="pop"] &)'),
  ],
};
