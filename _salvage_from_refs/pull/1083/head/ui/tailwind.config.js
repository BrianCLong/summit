module.exports = {
  "content": [
    "./ui/**/*.{html,js,jsx,ts,tsx}",
    "./client/src/**/*.{js,jsx,ts,tsx}",
    "./server/src/**/*.{js,ts}"
  ],
  "theme": {
    "extend": {
      "colors": {
        "brand-primary": "#5b9cff",
        "brand-secondary": "#667eea",
        "brand-tertiary": "#764ba2",
        "background-primary": "#0b0f14",
        "background-secondary": "#1c1f26",
        "background-tertiary": "#2a2f3a",
        "background-surface": "#ffffff",
        "background-surface-dim": "#f8f9fa",
        "background-surface-bright": "#ffffff",
        "foreground-primary": "#e6edf3",
        "foreground-secondary": "#7c8591",
        "foreground-tertiary": "#484f58",
        "foreground-inverse": "#0b0f14",
        "semantic-success": "#28a745",
        "semantic-warning": "#ffc107",
        "semantic-error": "#dc3545",
        "semantic-info": "#17a2b8",
        "status-up": "#28a745",
        "status-down": "#dc3545",
        "status-degraded": "#ffc107",
        "status-unknown": "#6c757d",
        "transparent": "transparent",
        "current": "currentColor",
        "black": "#000000",
        "white": "#ffffff"
      },
      "fontFamily": {
        "sans": [
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif"
        ],
        "mono": [
          "SFMono-Regular",
          "SF Mono",
          "Monaco",
          "Cascadia Code",
          "Roboto Mono",
          "Consolas",
          "Courier New",
          "monospace"
        ]
      },
      "fontSize": {
        "xs": [
          "0.75rem",
          {
            "lineHeight": "1.5"
          }
        ],
        "sm": [
          "0.875rem",
          {
            "lineHeight": "1.5"
          }
        ],
        "base": [
          "1rem",
          {
            "lineHeight": "1.5"
          }
        ],
        "lg": [
          "1.125rem",
          {
            "lineHeight": "1.5"
          }
        ],
        "xl": [
          "1.25rem",
          {
            "lineHeight": "1.5"
          }
        ],
        "2xl": [
          "1.5rem",
          {
            "lineHeight": "1.5"
          }
        ],
        "3xl": [
          "1.875rem",
          {
            "lineHeight": "1.5"
          }
        ],
        "4xl": [
          "2.25rem",
          {
            "lineHeight": "1.5"
          }
        ]
      },
      "fontWeight": {
        "light": "300",
        "normal": "400",
        "medium": "500",
        "semibold": "600",
        "bold": "700"
      },
      "lineHeight": {
        "tight": "1.25",
        "normal": "1.5",
        "relaxed": "1.75"
      },
      "spacing": {
        "0": "0",
        "1": "0.25rem",
        "2": "0.5rem",
        "3": "0.75rem",
        "4": "1rem",
        "5": "1.25rem",
        "6": "1.5rem",
        "8": "2rem",
        "10": "2.5rem",
        "12": "3rem",
        "16": "4rem",
        "20": "5rem",
        "24": "6rem"
      },
      "borderRadius": {
        "none": "0",
        "sm": "0.25rem",
        "base": "0.375rem",
        "md": "0.5rem",
        "lg": "0.75rem",
        "xl": "1rem",
        "2xl": "1.5rem",
        "full": "9999px"
      },
      "boxShadow": {
        "sm": "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
        "base": "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)",
        "md": "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
        "lg": "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
        "xl": "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
        "2xl": "0 25px 50px -12px rgba(0, 0, 0, 0.25)"
      },
      "screens": {
        "sm": "640px",
        "md": "768px",
        "lg": "1024px",
        "xl": "1280px",
        "2xl": "1536px"
      },
      "zIndex": {
        "base": "0",
        "dropdown": "1000",
        "sticky": "1020",
        "fixed": "1030",
        "modal-backdrop": "1040",
        "modal": "1050",
        "popover": "1060",
        "tooltip": "1070",
        "toast": "1080"
      },
      "transitionDuration": {
        "fast": "150ms",
        "normal": "200ms",
        "slow": "300ms",
        "slower": "500ms"
      },
      "transitionTimingFunction": {
        "ease-in": "cubic-bezier(0.4, 0, 1, 1)",
        "ease-out": "cubic-bezier(0, 0, 0.2, 1)",
        "ease-in-out": "cubic-bezier(0.4, 0, 0.2, 1)"
      }
    }
  },
  "plugins": [
    null
  ],
  "darkMode": "class",
  "variants": {
    "extend": {
      "opacity": [
        "disabled"
      ],
      "cursor": [
        "disabled"
      ],
      "backgroundColor": [
        "active",
        "disabled"
      ],
      "textColor": [
        "active",
        "disabled"
      ]
    }
  }
};