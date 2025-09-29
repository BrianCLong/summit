import { createTheme } from '@mui/material/styles';

export const getIntelGraphTheme = (mode) => createTheme({
  palette: {
    mode,
    primary: {
      main: mode === 'dark' ? '#4DA3FF' : '#0055A4',
      light: mode === 'dark' ? '#80C1FF' : '#4DA3FF',
      dark: mode === 'dark' ? '#003A73' : '#003A73',
      contrastText: mode === 'dark' ? '#000' : '#fff'
    },
    secondary: {
      main: mode === 'dark' ? '#FF8C42' : '#E85D04',
      light: mode === 'dark' ? '#FFB380' : '#FFA66B',
      dark: mode === 'dark' ? '#C14A00' : '#C14A00',
      contrastText: mode === 'dark' ? '#000' : '#fff'
    },
    success: { main: mode === 'dark' ? '#95D5B2' : '#2D6A4F' },
    error: { main: mode === 'dark' ? '#FF6B6B' : '#D00000' },
    warning: { main: mode === 'dark' ? '#FFD166' : '#FFBA08' },
    background: {
      default: mode === 'dark' ? '#0F172A' : '#F8FAFC',
      paper: mode === 'dark' ? '#1E293B' : '#FFFFFF'
    },
    text: {
      primary: mode === 'dark' ? '#F1F5F9' : '#0F172A',
      secondary: mode === 'dark' ? '#94A3B8' : '#475569'
    }
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica Neue", Arial, sans-serif',
    h1: { fontSize: '2.5rem', fontWeight: 700, lineHeight: 1.2 },
    h2: { fontSize: '2rem', fontWeight: 600, lineHeight: 1.25 },
    h3: { fontSize: '1.75rem', fontWeight: 600, lineHeight: 1.3 },
    h4: { fontSize: '1.5rem', fontWeight: 500, lineHeight: 1.35 },
    body1: { fontSize: '1rem', fontWeight: 400, lineHeight: 1.5 },
    body2: { fontSize: '0.875rem', fontWeight: 400, lineHeight: 1.5 },
    caption: { fontSize: '0.75rem', fontWeight: 400, lineHeight: 1.4 },
    button: { textTransform: 'none', fontWeight: 600, fontSize: '0.875rem', lineHeight: 1.4 }
  },
  shape: { borderRadius: 8 },
  spacing: 8,
});
