
import { logger } from '../config/logger.js';
import { getPostgresPool } from '../db/postgres.js';

export interface DarkLaunchFlag {
  subsystem: string;
  feature: string;
  enabled: boolean;
  samplingRate: number; // 0 to 1
  isShadowOnly: boolean; // If true, output is not persisted or visible to user
}

/**
 * Service for managing 'Dark Launch' capabilities across major subsystems (Task #107).
 */
export class DarkLaunchService {
  private static instance: DarkLaunchService;
  private flags: Map<string, DarkLaunchFlag> = new Map();

  private constructor() {}

  public static getInstance(): DarkLaunchService {
    if (!DarkLaunchService.instance) {
      DarkLaunchService.instance = new DarkLaunchService();
    }
    return DarkLaunchService.instance;
  }

  /**
   * Checks if a feature should be "Dark Launched" for a specific request.
   */
  public isDarkLaunchActive(subsystem: string, feature: string): boolean {
    const flagKey = `${subsystem}:${feature}`;
    const flag = this.flags.get(flagKey);

    if (!flag || !flag.enabled) return false;

    return Math.random() < flag.samplingRate;
  }

  /**
   * Registers or updates a dark launch flag.
   */
  public async setFlag(flag: DarkLaunchFlag): Promise<void> {
    const flagKey = `${flag.subsystem}:${flag.feature}`;
    this.flags.set(flagKey, flag);

    const pool = getPostgresPool();
    await pool.query(
      `INSERT INTO dark_launch_flags (subsystem, feature, enabled, sampling_rate, is_shadow_only, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       ON CONFLICT (subsystem, feature) DO UPDATE SET
         enabled = $3,
         sampling_rate = $4,
         is_shadow_only = $5,
         updated_at = NOW()`,
      [flag.subsystem, flag.feature, flag.enabled, flag.samplingRate, flag.isShadowOnly]
    );

    logger.info({ flagKey, enabled: flag.enabled }, 'DarkLaunch: Flag updated');
  }

  /**
   * Loads all flags from the database.
   */
  public async loadFlags(): Promise<void> {
    const pool = getPostgresPool();
    try {
      const result = await pool.query('SELECT * FROM dark_launch_flags');
      for (const row of result.rows) {
        this.flags.set(`${row.subsystem}:${row.feature}`, {
          subsystem: row.subsystem,
          feature: row.feature,
          enabled: row.enabled,
          samplingRate: row.sampling_rate,
          isShadowOnly: row.is_shadow_only
        });
      }
      logger.info({ count: result.rows.length }, 'DarkLaunch: Flags loaded');
    } catch (err: any) {
      if (err.message.includes('relation "dark_launch_flags" does not exist')) {
        return;
      }
      throw err;
    }
  }
}

export const darkLaunchService = DarkLaunchService.getInstance();
