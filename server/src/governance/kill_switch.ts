import { GovernanceVerdict, GovernanceReason } from '../../../packages/core/src/governance/verdict';

export enum KillSwitchMode {
  OFF = 'OFF',
  DENY_ALL = 'DENY_ALL',
  READ_ONLY = 'READ_ONLY',
  ROUTE_DENY = 'ROUTE_DENY',
}

export interface KillSwitchConfig {
  mode: KillSwitchMode;
  deniedRoutes?: string[]; // Regex patterns
  breakGlassEnabled?: boolean;
}

// In-memory config for now, can be replaced with a robust config store
let globalConfig: KillSwitchConfig = {
  mode: KillSwitchMode.OFF,
  deniedRoutes: [],
};

// Tenant specific overrides
const tenantOverrides = new Map<string, KillSwitchConfig>();

export function configureKillSwitch(config: KillSwitchConfig) {
  globalConfig = { ...globalConfig, ...config };
}

export function configureTenantKillSwitch(tenantId: string, config: KillSwitchConfig) {
  tenantOverrides.set(tenantId, config);
}

export function getKillSwitchMode(tenantId?: string): KillSwitchMode {
  if (process.env.KILL_SWITCH_MODE) {
    const envMode = process.env.KILL_SWITCH_MODE as KillSwitchMode;
    if (Object.values(KillSwitchMode).includes(envMode)) {
      return envMode;
    }
  }

  if (tenantId && tenantOverrides.has(tenantId)) {
    return tenantOverrides.get(tenantId)!.mode;
  }

  return globalConfig.mode;
}

export function checkKillSwitch(
  tenantId: string,
  route: string,
  method: string,
  isAdmin: boolean,
  isBreakGlass: boolean
): { allowed: boolean; status: GovernanceVerdict['status']; reasons: GovernanceReason[] } {
  const mode = getKillSwitchMode(tenantId);
  const reasons: GovernanceReason[] = [];

  // Break-glass check
  if (isBreakGlass) {
     if (process.env.BREAK_GLASS === '1' && isAdmin) {
         return { allowed: true, status: 'allow', reasons: [{ code: 'BREAK_GLASS', message: 'Break-glass access granted' }] };
     } else {
          return { allowed: false, status: 'deny', reasons: [{ code: 'BREAK_GLASS_FAILED', message: 'Break-glass attempt failed: Invalid credentials or environment' }] };
     }
  }

  switch (mode) {
    case KillSwitchMode.DENY_ALL:
      reasons.push({ code: 'KS_DENY_ALL', message: 'Global kill switch active: DENY_ALL' });
      return { allowed: false, status: 'deny', reasons };

    case KillSwitchMode.READ_ONLY:
      if (method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS') {
        reasons.push({ code: 'KS_READ_ONLY', message: 'Global kill switch active: READ_ONLY' });
        return { allowed: false, status: 'deny', reasons };
      }
       reasons.push({ code: 'KS_READ_ONLY_ACTIVE', message: 'Global kill switch active: READ_ONLY mode' });
      return { allowed: true, status: 'degrade', reasons };

    case KillSwitchMode.ROUTE_DENY:
      const deniedRoutes = globalConfig.deniedRoutes || [];
      const isDenied = deniedRoutes.some(pattern => new RegExp(pattern).test(route));
      if (isDenied) {
        reasons.push({ code: 'KS_ROUTE_DENY', message: `Route denied by kill switch: ${route}` });
        return { allowed: false, status: 'deny', reasons };
      }
      break;

    case KillSwitchMode.OFF:
    default:
      break;
  }

  return { allowed: true, status: 'allow', reasons: [] };
}
