import { createTheme } from '@mui/material/styles'

import { tokens } from './theme/tokens'

const defaultRadius = Number(tokens.radii.xl)
const pillRadius = Number(tokens.radii.pill)

export const theme = createTheme({
  palette: { mode: 'dark' },
  shape: { borderRadius: defaultRadius },
  components: {
    MuiPaper: { styleOverrides: { root: { borderRadius: defaultRadius } } },
    MuiButton: {
      styleOverrides: {
        root: { textTransform: 'none', borderRadius: pillRadius },
      },
    },
  },
})
