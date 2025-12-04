// =============================================
// Tenant Context for Multi-Tenant Support
// =============================================
import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
} from 'react'

interface Tenant {
  id: string
  name: string
  environment: 'dev' | 'staging' | 'prod'
  permissions: string[]
  budgetCap?: number
  region?: string
}

interface TenantContextType {
  currentTenant: Tenant | null
  availableTenants: Tenant[]
  switchTenant: (tenantId: string) => void
  hasPermission: (permission: string) => boolean
  environment: 'dev' | 'staging' | 'prod'
  setEnvironment: (env: 'dev' | 'staging' | 'prod') => void
}

const TenantContext = createContext<TenantContextType | undefined>(undefined)

export function useTenant() {
  const context = useContext(TenantContext)
  if (!context) {
    throw new Error('useTenant must be used within TenantProvider')
  }
  return context
}

interface TenantProviderProps {
  children: ReactNode
}

export function TenantProvider({ children }: TenantProviderProps) {
  const [currentTenant, setCurrentTenant] = useState<Tenant | null>(null)
  const [environment, setEnvironment] = useState<'dev' | 'staging' | 'prod'>(
    'dev'
  )
  const [availableTenants] = useState<Tenant[]>([
    {
      id: 'default',
      name: 'Default',
      environment: 'dev',
      permissions: [
        'runs.view',
        'runs.create',
        'runbooks.view',
        'runbooks.edit',
        'budgets.view',
      ],
      budgetCap: 1000,
      region: 'us-west-2',
    },
    {
      id: 'production',
      name: 'Production',
      environment: 'prod',
      permissions: ['runs.view', 'runs.create', 'runbooks.view', 'admin.all'],
      budgetCap: 10000,
      region: 'us-east-1',
    },
    {
      id: 'staging',
      name: 'Staging',
      environment: 'staging',
      permissions: [
        'runs.view',
        'runs.create',
        'runbooks.view',
        'runbooks.edit',
      ],
      budgetCap: 2000,
      region: 'us-west-2',
    },
  ])

  // Initialize with default tenant
  useEffect(() => {
    if (!currentTenant && availableTenants.length > 0) {
      setCurrentTenant(availableTenants[0])
    }
  }, [availableTenants, currentTenant])

  const switchTenant = (tenantId: string) => {
    const tenant = availableTenants.find(t => t.id === tenantId)
    if (tenant) {
      setCurrentTenant(tenant)
      setEnvironment(tenant.environment)
    }
  }

  const hasPermission = (permission: string) => {
    if (!currentTenant) {return false}
    return (
      currentTenant.permissions.includes(permission) ||
      currentTenant.permissions.includes('admin.all')
    )
  }

  return (
    <TenantContext.Provider
      value={{
        currentTenant,
        availableTenants,
        switchTenant,
        hasPermission,
        environment,
        setEnvironment,
      }}
    >
      {children}
    </TenantContext.Provider>
  )
}
