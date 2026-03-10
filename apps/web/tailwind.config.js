import { createRequire } from 'module';
const require = createRequire(import.meta.url);

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
    './node_modules/@tremor/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: { "2xl": "1400px" },
    },
    extend: {
      colors: {
        /* ── Legacy shadcn/radix variable map (required for component compat) ── */
        border:       "hsl(var(--border))",
        input:        "hsl(var(--input))",
        ring:         "hsl(var(--ring))",
        background:   "hsl(var(--background))",
        foreground:   "hsl(var(--foreground))",
        primary: {
          DEFAULT:    "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT:    "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT:    "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT:    "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT:    "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT:    "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT:    "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },

        /* ── Summit Surface Scale ── */
        surface: {
          void:    "var(--surface-void)",
          base:    "var(--surface-base)",
          raised:  "var(--surface-raised)",
          panel:   "var(--surface-panel)",
          overlay: "var(--surface-overlay)",
          high:    "var(--surface-high)",
          highest: "var(--surface-highest)",
          inverse: "var(--surface-inverse)",
        },

        /* ── Text Hierarchy ── */
        text: {
          primary:   "var(--text-primary)",
          secondary: "var(--text-secondary)",
          tertiary:  "var(--text-tertiary)",
          disabled:  "var(--text-disabled)",
          accent:    "var(--text-accent)",
          inverse:   "var(--text-inverse)",
          brand:     "var(--text-brand)",
        },

        /* ── Accent / Primary scale ── */
        summit: {
          900: "var(--accent-900)",
          800: "var(--accent-800)",
          700: "var(--accent-700)",
          600: "var(--accent-600)",
          500: "var(--accent-500)",
          400: "var(--accent-400)",
          300: "var(--accent-300)",
          200: "var(--accent-200)",
          100: "var(--accent-100)",
        },

        /* ── Severity / Threat levels ── */
        threat: {
          critical: "var(--severity-critical-solid)",
          high:     "var(--severity-high-solid)",
          medium:   "var(--severity-medium-solid)",
          low:      "var(--severity-low-solid)",
          info:     "var(--severity-info-solid)",
        },

        /* ── Status states ── */
        status: {
          active:   "var(--status-active)",
          warning:  "var(--status-warning)",
          error:    "var(--status-error)",
          inactive: "var(--status-inactive)",
          pending:  "var(--status-pending)",
          success:  "var(--status-success)",
        },

        /* ── Intel brand palette ── */
        intel: {
          50:  "var(--color-intel-50)",
          100: "var(--color-intel-100)",
          200: "var(--color-intel-200)",
          300: "var(--color-intel-300)",
          400: "var(--color-intel-400)",
          500: "var(--color-intel-500)",
          600: "var(--color-intel-600)",
          700: "var(--color-intel-700)",
          800: "var(--color-intel-800)",
          900: "var(--color-intel-900)",
          950: "var(--color-intel-950)",
        },
      },

      borderRadius: {
        lg:   "var(--radius)",
        md:   "calc(var(--radius) - 2px)",
        sm:   "calc(var(--radius) - 4px)",
      },

      fontFamily: {
        sans: ["Inter", "Segoe UI", "system-ui", "-apple-system", "sans-serif"],
        mono: [
          "IBM Plex Mono",
          "JetBrains Mono",
          "Fira Code",
          "Cascadia Code",
          "ui-monospace",
          "monospace",
        ],
      },

      fontSize: {
        "2xs":    ["10px", { lineHeight: "1.4", letterSpacing: "0.02em" }],
        xs:       ["11px", { lineHeight: "1.4", letterSpacing: "0.01em" }],
        sm:       ["12px", { lineHeight: "1.5" }],
        md:       ["13px", { lineHeight: "1.5" }],
        base:     ["14px", { lineHeight: "1.5" }],
        lg:       ["16px", { lineHeight: "1.4", letterSpacing: "-0.01em" }],
        xl:       ["18px", { lineHeight: "1.35", letterSpacing: "-0.015em" }],
        "2xl":    ["20px", { lineHeight: "1.3",  letterSpacing: "-0.02em" }],
        "3xl":    ["24px", { lineHeight: "1.25", letterSpacing: "-0.025em" }],
        "4xl":    ["28px", { lineHeight: "1.2",  letterSpacing: "-0.03em" }],
        "5xl":    ["32px", { lineHeight: "1.15", letterSpacing: "-0.03em" }],
        "6xl":    ["40px", { lineHeight: "1.1",  letterSpacing: "-0.035em" }],
        display:  ["48px", { lineHeight: "1.05", letterSpacing: "-0.04em" }],
      },

      spacing: {
        "3xs": "2px",
        "2xs": "4px",
        xs:    "8px",
        sm:    "12px",
        md:    "16px",
        lg:    "20px",
        xl:    "24px",
        "2xl": "32px",
        "3xl": "40px",
        "4xl": "48px",
        "5xl": "64px",
        "6xl": "80px",
        "7xl": "96px",
      },

      boxShadow: {
        xs:    "0 1px 2px rgba(0, 0, 0, 0.3)",
        sm:    "0 2px 4px rgba(0, 0, 0, 0.4), 0 1px 2px rgba(0, 0, 0, 0.3)",
        md:    "0 4px 12px rgba(0, 0, 0, 0.5), 0 2px 4px rgba(0, 0, 0, 0.4)",
        lg:    "0 8px 24px rgba(0, 0, 0, 0.6), 0 4px 8px rgba(0, 0, 0, 0.4)",
        xl:    "0 16px 48px rgba(0, 0, 0, 0.7), 0 8px 16px rgba(0, 0, 0, 0.5)",
        glow:  "0 0 0 1px rgba(37, 99, 235, 0.4), 0 0 20px rgba(37, 99, 235, 0.15)",
        "glow-sm": "0 0 0 1px rgba(37, 99, 235, 0.3), 0 0 10px rgba(37, 99, 235, 0.1)",
        inner: "inset 0 1px 3px rgba(0, 0, 0, 0.4)",
      },

      transitionDuration: {
        fast:      "100ms",
        base:      "150ms",
        slow:      "250ms",
        deliberate: "400ms",
      },

      transitionTimingFunction: {
        "out-expo":   "cubic-bezier(0.16, 1, 0.3, 1)",
        "in-expo":    "cubic-bezier(0.7, 0, 0.84, 0)",
        "spring":     "cubic-bezier(0.34, 1.56, 0.64, 1)",
      },

      keyframes: {
        "accordion-down": {
          from: { height: 0 },
          to:   { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to:   { height: 0 },
        },
        "fade-in": {
          from: { opacity: 0, transform: "translateY(4px)" },
          to:   { opacity: 1, transform: "translateY(0)" },
        },
        "slide-in-left": {
          from: { opacity: 0, transform: "translateX(-8px)" },
          to:   { opacity: 1, transform: "translateX(0)" },
        },
        shimmer: {
          from: { backgroundPosition: "-400px 0" },
          to:   { backgroundPosition: "400px 0" },
        },
        pulse: {
          "0%, 100%": { opacity: 1 },
          "50%":      { opacity: 0.4 },
        },
        "scan": {
          "0%":   { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(100%)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up":   "accordion-up 0.2s ease-out",
        "fade-in":        "fade-in 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
        "slide-in-left":  "slide-in-left 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
        shimmer:          "shimmer 1.4s ease-in-out infinite",
        pulse:            "pulse 2s ease-in-out infinite",
        scan:             "scan 1.5s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
