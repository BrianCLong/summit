import fs from 'fs';
import path from 'path';
import pino from 'pino';

const logger = (pino as any)({ name: 'tenant-kill-switch' });

export interface KillSwitchConfig {
  [tenantId: string]: boolean;
}

export class TenantKillSwitch {
  private cache: KillSwitchConfig = {};
  private lastLoadedAt = 0;
  private lastState: Map<string, boolean> = new Map();
  private lastExists = false;

  constructor(
    private filePath: string = process.env.TENANT_KILL_SWITCH_FILE ||
      path.join(process.cwd(), 'config', 'tenant-killswitch.json'),
  ) {}

  private loadConfig(): KillSwitchConfig {
    try {
      const exists = fs.existsSync(this.filePath);
      if (!exists) {
        if (this.lastExists !== exists) {
          logger.warn(
            { filePath: this.filePath },
            'Kill-switch config file missing; tenants cannot be deactivated until it exists',
          );
        }
        this.lastExists = false;
        this.cache = {};
        return {};
      }
      this.lastExists = true;

      const stats = fs.statSync(this.filePath);
      if (stats.mtimeMs <= this.lastLoadedAt) {
        return this.cache;
      }

      const raw = fs.readFileSync(this.filePath, 'utf-8');
      const parsed = JSON.parse(raw) as KillSwitchConfig;
      this.cache = parsed;
      this.lastLoadedAt = stats.mtimeMs;
      return parsed;
    } catch (error: any) {
      logger.warn(
        { filePath: this.filePath, error },
        'Kill-switch config unavailable, continuing without overrides',
      );
      this.cache = {};
      return {};
    }
  }

  isDisabled(tenantId: string): boolean {
    const config = this.loadConfig();
    const disabled = Boolean(config[tenantId]);
    const previous = this.lastState.get(tenantId);

    if (previous !== disabled) {
      const action = disabled ? 'activated' : 'cleared';
      logger.warn(
        { tenantId, action },
        `Tenant kill switch ${action} for ${tenantId}`,
      );
      this.lastState.set(tenantId, disabled);
    }

    return disabled;
  }

  hasConfig(): boolean {
    return this.lastExists || fs.existsSync(this.filePath);
  }
}

export const tenantKillSwitch = new TenantKillSwitch();
