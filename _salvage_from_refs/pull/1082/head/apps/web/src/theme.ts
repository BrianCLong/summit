import { createTheme } from '@mui/material/styles';
export const theme = createTheme({
  palette: { mode: 'dark' },
  shape: { borderRadius: 16 },
  components: {
    MuiPaper: { styleOverrides: { root: { borderRadius: 16 } } },
    MuiButton: { styleOverrides: { root: { textTransform: 'none', borderRadius: 9999 } } }
  }
});
