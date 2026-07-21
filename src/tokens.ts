/**
 * WTG Design Tokens
 *
 * Single source of truth for brand colors and visual constants.
 * The Tailwind config mirrors these values — update both in sync.
 *
 * Primary:   #1e1665  Deep indigo — sidebar, headings, dark chrome
 * Secondary: #2387ee  Action blue — buttons, links, active states, focus rings
 */

export const colors = {
  /** Primary brand — WTG deep indigo */
  primary: {
    DEFAULT: '#1e1665',
    dark:    '#150f4a',   // deeper shade for pressed/dark surfaces
    light:   '#251e7a',   // subtle tint for gradients
    mid:     '#2c228e',   // mid tint for gradients
  },

  /** Secondary brand — WTG action blue */
  secondary: {
    DEFAULT: '#2387ee',
    hover:   '#1a75d8',   // 10% darker for hover/pressed states
    light:   '#5ba4f2',   // lighter for text-on-light or icon accents
  },

  /**
   * Status / severity palette
   * Used for criticality badges, priority indicators, and rule failure chips.
   */
  status: {
    high:   { bg: '#fef2f2', text: '#dc2626', border: '#fca5a5' },
    medium: { bg: '#fffbeb', text: '#d97706', border: '#fcd34d' },
    low:    { bg: '#f0fdf4', text: '#16a34a', border: '#86efac' },
    unset:  { bg: '#f9fafb', text: '#6b7280', border: '#d1d5db' },
  },

  /** Surface and border neutrals (unchanged from Tailwind slate scale) */
  surface:    '#F8FAFC',
  surfaceAlt: '#F1F5F9',
  border:     '#E2E8F0',
  slate:      '#64748B',
  slateLight: '#94A3B8',
} as const

export const typography = {
  fontFamily: {
    sans: ['Inter', 'Segoe UI', 'system-ui', '-apple-system', 'sans-serif'],
    mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
  },
} as const

export const radius = {
  card:   '0.75rem',   // 12px — cards, panels
  button: '0.5rem',    // 8px  — buttons, inputs
  badge:  '9999px',    // full — pills and badges
  chip:   '0.375rem',  // 6px  — small inline chips
} as const
