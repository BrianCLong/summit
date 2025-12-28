export type ExposureMode = 'production' | 'sales_demo' | 'exec_demo' | 'internal'

export type ExposureSurfaceId =
  | 'auth.signin'
  | 'auth.signup'
  | 'auth.verify'
  | 'access_denied'
  | 'home'
  | 'explore'
  | 'analysis.tri_pane'
  | 'analysis.geoint'
  | 'analysis.narrative'
  | 'alerts'
  | 'alert_detail'
  | 'cases'
  | 'case_detail'
  | 'dashboards.command_center'
  | 'dashboards.supply_chain'
  | 'dashboards.advanced'
  | 'internal.command'
  | 'mission_control'
  | 'data.sources'
  | 'models'
  | 'reports'
  | 'admin'
  | 'admin.consistency'
  | 'admin.feature_flags'
  | 'help'
  | 'changelog'
  | 'demo_control'
  | 'onboarding'
  | 'maestro'

export type ExposureFeatureKey =
  | 'maestro.newRunConsole'
  | 'dashboard.realtime'
  | 'ui.annotationsV1'
  | 'ui.mapClustering'

interface ExposureConfig {
  mode: ExposureMode
  label: string
  intent: string
  banner?: string
  badge?: string
  isDemo: boolean
  demoDataLabel?: string
  allowedSurfaces: Set<ExposureSurfaceId>
  allowExperimentalFeatures: boolean
  homeCopyOverrides?: {
    subheading?: string
    commandCenterDescription?: string
  }
}

const getEnvValue = (key: string): string => {
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
    return import.meta.env[key] as string
  }
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return process.env[key] as string
  }
  return ''
}

const normalizeMode = (raw: string): ExposureMode | null => {
  switch (raw) {
    case 'production':
    case 'sales_demo':
    case 'exec_demo':
    case 'internal':
      return raw
    default:
      return null
  }
}

const resolveExposureMode = (): ExposureMode => {
  const raw = getEnvValue('VITE_EXPOSURE_MODE')
  const normalized = normalizeMode(raw)
  if (normalized) {
    return normalized
  }

  const viteMode =
    typeof import.meta !== 'undefined' && import.meta.env
      ? (import.meta.env.MODE as string | undefined)
      : undefined

  if (viteMode === 'development' || viteMode === 'test') {
    return 'internal'
  }

  return 'production'
}

const baseAuthSurfaces: ExposureSurfaceId[] = [
  'auth.signin',
  'auth.signup',
  'auth.verify',
  'access_denied',
]

const exposureConfigs: Record<ExposureMode, ExposureConfig> = {
  production: {
    mode: 'production',
    label: 'Production / Customer Mode',
    intent: 'Customer-facing production experience with governed surfaces.',
    isDemo: false,
    allowedSurfaces: new Set([
      ...baseAuthSurfaces,
      'home',
      'explore',
      'alerts',
      'alert_detail',
      'cases',
      'case_detail',
      'dashboards.command_center',
      'dashboards.supply_chain',
      'data.sources',
      'models',
      'reports',
      'help',
      'changelog',
      'onboarding',
    ]),
    allowExperimentalFeatures: false,
  },
  sales_demo: {
    mode: 'sales_demo',
    label: 'Sales Demo Mode',
    intent: 'Externally-facing sales demonstrations with demo-safe surfaces only.',
    banner:
      'SALES DEMO MODE — Data is illustrative. No forecasts, autonomy, or compliance guarantees are implied.',
    badge: 'Sales Demo',
    isDemo: true,
    demoDataLabel: 'Demo data is illustrative and non-operational.',
    allowedSurfaces: new Set([
      ...baseAuthSurfaces,
      'home',
      'explore',
      'alerts',
      'alert_detail',
      'cases',
      'case_detail',
      'dashboards.command_center',
      'dashboards.supply_chain',
      'reports',
      'help',
      'changelog',
    ]),
    allowExperimentalFeatures: false,
    homeCopyOverrides: {
      subheading: 'Illustrative operational view for demonstration purposes only.',
      commandCenterDescription: 'Operational overview dashboard',
    },
  },
  exec_demo: {
    mode: 'exec_demo',
    label: 'Executive / Board Demo Mode',
    intent: 'High-level executive overview with strictly curated surfaces.',
    banner:
      'EXECUTIVE DEMO MODE — Curated, illustrative views only. No future-state claims or guarantees.',
    badge: 'Executive Demo',
    isDemo: true,
    demoDataLabel: 'Executive demo data is illustrative and non-operational.',
    allowedSurfaces: new Set([
      ...baseAuthSurfaces,
      'home',
      'dashboards.command_center',
      'dashboards.supply_chain',
      'reports',
      'help',
      'changelog',
    ]),
    allowExperimentalFeatures: false,
    homeCopyOverrides: {
      subheading: 'Curated executive overview. Data shown is illustrative only.',
      commandCenterDescription: 'Executive operations overview',
    },
  },
  internal: {
    mode: 'internal',
    label: 'Internal / Engineering Mode',
    intent: 'Full internal access for development, QA, and engineering workflows.',
    banner: 'INTERNAL MODE — Not approved for external demonstrations.',
    badge: 'Internal',
    isDemo: false,
    allowedSurfaces: new Set([
      ...baseAuthSurfaces,
      'home',
      'explore',
      'analysis.tri_pane',
      'analysis.geoint',
      'analysis.narrative',
      'alerts',
      'alert_detail',
      'cases',
      'case_detail',
      'dashboards.command_center',
      'dashboards.supply_chain',
      'dashboards.advanced',
      'internal.command',
      'mission_control',
      'data.sources',
      'models',
      'reports',
      'admin',
      'admin.consistency',
      'admin.feature_flags',
      'help',
      'changelog',
      'demo_control',
      'onboarding',
      'maestro',
    ]),
    allowExperimentalFeatures: true,
  },
}

export const exposureConfig = exposureConfigs[resolveExposureMode()]

export const isExposureMode = (mode: ExposureMode): boolean =>
  exposureConfig.mode === mode

export const isSurfaceAllowed = (surface: ExposureSurfaceId): boolean =>
  exposureConfig.allowedSurfaces.has(surface)

export const isExperimentalFeatureAllowed = (
  feature: ExposureFeatureKey
): boolean => {
  const isExperimental = new Set<ExposureFeatureKey>([
    'maestro.newRunConsole',
    'dashboard.realtime',
    'ui.annotationsV1',
    'ui.mapClustering',
  ]).has(feature)

  if (!isExperimental) {
    return true
  }

  return exposureConfig.allowExperimentalFeatures
}

export const getExposureCopyOverrides = () =>
  exposureConfig.homeCopyOverrides
