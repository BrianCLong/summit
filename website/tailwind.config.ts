import type { Config } from 'tailwindcss';

export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          'ui-sans-serif',
          'system-ui',
          'Inter',
          'Segoe UI',
          'Roboto',
          'Arial',
        ],
      },
      colors: {
        background: 'var(--bg)',
        foreground: 'var(--fg)',
        muted: 'var(--muted)',
        'muted-2': 'var(--muted2)',
        card: 'var(--card)',
        border: 'var(--border)',
        accent: 'var(--accent)',
      },
    },
  },
  plugins: [],
} satisfies Config;
