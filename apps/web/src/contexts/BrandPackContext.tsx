import React from 'react'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import config from '@/config'
import { DesignSystemProvider } from '@/theme/DesignSystemProvider'
import { tokens } from '@/theme/tokens'
import { useTenant } from '@/contexts/TenantContext'

type BrandPackPalette = {
  mode: 'light' | 'dark'
  primary: string
  secondary?: string
  accent?: string
  background: string
  surface: string
  text: {
    primary: string
    secondary?: string
  }
}

type BrandPackTokens = {
  palette: BrandPackPalette
  typography?: {
    fontFamily: string
    baseSize?: number
  }
  radii?: {
    sm?: number
    md?: number
    lg?: number
    pill?: number
  }
  spacing?: {
    sm?: number
    md?: number
    lg?: number
  }
  shadows?: {
    sm?: string
    md?: string
    lg?: string
  }
}

export type BrandPack = {
  id: string
  name: string
  websiteUrl: string
  logos: {
    primary: string
    mark?: string
    inverted?: string
  }
  navLabels: Record<string, string>
  tokens: BrandPackTokens
  updatedAt: string
}

type BrandPackState = {
  pack: BrandPack
  loading: boolean
  error?: string
}

const defaultBrandPack: BrandPack = {
  id: 'summit-default',
  name: 'Summit',
  websiteUrl: 'https://summit.example.com',
  logos: {
    primary: 'https://cdn.summit.example.com/brand/summit-primary.svg',
    mark: 'https://cdn.summit.example.com/brand/summit-mark.svg',
    inverted: 'https://cdn.summit.example.com/brand/summit-inverted.svg',
  },
  navLabels: {
    home: 'Home',
    investigations: 'Investigations',
    cases: 'Cases',
    dashboards: 'Dashboards',
    settings: 'Settings',
    support: 'Support',
  },
  tokens: {
    palette: {
      mode: 'dark',
      primary: '#0f766e',
      secondary: '#1d4ed8',
      accent: '#f59e0b',
      background: '#0b1120',
      surface: '#111827',
      text: {
        primary: '#f9fafb',
        secondary: '#cbd5f5',
      },
    },
    typography: {
      fontFamily: tokens.typography.fontFamily,
      baseSize: 16,
    },
    radii: {
      sm: Number(tokens.radii.sm),
      md: Number(tokens.radii.md),
      lg: Number(tokens.radii.lg),
      pill: Number(tokens.radii.pill),
    },
    spacing: {
      sm: Number(tokens.spacing.sm),
      md: Number(tokens.spacing.md),
      lg: Number(tokens.spacing.xl),
    },
    shadows: {
      sm: tokens.shadows.sm,
      md: tokens.shadows.md,
      lg: tokens.shadows.lg,
    },
  },
  updatedAt: '2026-01-05T02:02:27Z',
}

const BrandPackContext = React.createContext<BrandPackState | undefined>(
  undefined
)

export const useBrandPack = () => {
  const context = React.useContext(BrandPackContext)
  if (!context) {
    throw new Error('useBrandPack must be used within BrandPackProvider')
  }
  return context
}

const buildTokenOverrides = (pack: BrandPack) => {
  const radii = pack.tokens.radii ?? {}
  const spacing = pack.tokens.spacing ?? {}
  const typography = pack.tokens.typography
  const shadows = pack.tokens.shadows ?? {}

  return {
    'ds-font-family-sans':
      typography?.fontFamily ?? tokens.typography.fontFamily,
    'ds-radius-sm': radii.sm ?? tokens.radii.sm,
    'ds-radius-md': radii.md ?? tokens.radii.md,
    'ds-radius-lg': radii.lg ?? tokens.radii.lg,
    'ds-radius-pill': radii.pill ?? tokens.radii.pill,
    'ds-space-sm': spacing.sm ?? tokens.spacing.sm,
    'ds-space-md': spacing.md ?? tokens.spacing.md,
    'ds-space-lg': spacing.lg ?? tokens.spacing.lg,
    'ds-shadow-sm': shadows.sm ?? tokens.shadows.sm,
    'ds-shadow-md': shadows.md ?? tokens.shadows.md,
    'ds-shadow-lg': shadows.lg ?? tokens.shadows.lg,
  }
}

const buildMuiTheme = (pack: BrandPack) => {
  const palette = pack.tokens.palette
  return createTheme({
    palette: {
      mode: palette.mode,
      primary: { main: palette.primary },
      secondary: palette.secondary ? { main: palette.secondary } : undefined,
      background: {
        default: palette.background,
        paper: palette.surface,
      },
      text: {
        primary: palette.text.primary,
        secondary: palette.text.secondary ?? palette.text.primary,
      },
    },
    typography: {
      fontFamily: pack.tokens.typography?.fontFamily,
      fontSize: pack.tokens.typography?.baseSize,
    },
    shape: {
      borderRadius: pack.tokens.radii?.md ?? 16,
    },
  })
}

async function fetchBrandPack(tenantId: string) {
  const token = localStorage.getItem('auth_token')
  const response = await fetch(
    `${config.apiBaseUrl}/brand-packs/tenants/${tenantId}`,
    {
      credentials: 'include',
      headers: token
        ? {
            Authorization: `Bearer ${token}`,
          }
        : undefined,
    }
  )

  if (!response.ok) {
    throw new Error(`Failed to load brand pack (${response.status})`)
  }

  const data = await response.json()
  return data.pack as BrandPack
}

export const BrandPackProvider = ({
  children,
}: {
  children: React.ReactNode
}) => {
  const { currentTenant } = useTenant()
  const [state, setState] = React.useState<BrandPackState>({
    pack: defaultBrandPack,
    loading: true,
  })

  React.useEffect(() => {
    if (!currentTenant?.id) {
      setState(prev => ({ ...prev, loading: false }))
      return
    }

    let isActive = true
    setState(prev => ({ ...prev, loading: true, error: undefined }))

    fetchBrandPack(currentTenant.id)
      .then(pack => {
        if (!isActive) return
        setState({ pack, loading: false })
      })
      .catch(error => {
        if (!isActive) return
        setState({
          pack: defaultBrandPack,
          loading: false,
          error: error.message,
        })
      })

    return () => {
      isActive = false
    }
  }, [currentTenant?.id])

  const muiTheme = React.useMemo(() => buildMuiTheme(state.pack), [state.pack])

  const tokenOverrides = React.useMemo(
    () => buildTokenOverrides(state.pack),
    [state.pack]
  )

  return (
    <BrandPackContext.Provider value={state}>
      <DesignSystemProvider tokenOverrides={tokenOverrides} enableTokens>
        <ThemeProvider theme={muiTheme}>
          <CssBaseline />
          {children}
        </ThemeProvider>
      </DesignSystemProvider>
    </BrandPackContext.Provider>
  )
}
