/** @type {import('tailwindcss').Config} */
// Color values mirror src/tokens.ts; keep in sync when updating brand colors.
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        wtg: {
          // Primary brand — WTG deep indigo (#1e1665)
          primary:        '#1e1665',
          'primary-dark':  '#150f4a',
          'primary-light': '#251e7a',
          'primary-mid':   '#2c228e',
          // Secondary brand — WTG action blue (#2387ee)
          secondary:          '#2387ee',
          'secondary-hover':  '#1a75d8',
          'secondary-light':  '#5ba4f2',
          // Neutrals
          slate:         '#64748B',
          'slate-light': '#94A3B8',
          surface:       '#F8FAFC',
          'surface-alt': '#F1F5F9',
          border:        '#E2E8F0',
        }
      },
      fontFamily: {
        sans: ['"Inter"', '"Segoe UI"', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
