module.exports = {
  theme: {
    extend: {
      colors: {
        summit: {
          primary: '#1d4ed8',
          secondary: '#3b82f6',
          accent: '#fbbf24',
          dark: '#1e293b',
          light: '#f8fafc'
        }
      },
      spacing: {
        '128': '32rem',
        '144': '36rem',
      },
      typography: (theme) => ({
        DEFAULT: {
          css: {
            color: theme('colors.gray.800'),
          },
        },
      }),
    }
  },
  darkMode: 'class',
}
