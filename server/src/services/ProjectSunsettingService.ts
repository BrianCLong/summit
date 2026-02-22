
import { logger } from '../config/logger.js';
import { getPostgresPool } from '../db/postgres.js';

/**
 * Service for Final Project (Tenant) Sunsetting Automation (Task #106).
 * Automatically decommissions inactive tenants based on kill criteria.
 */
export class ProjectSunsettingService {
  private static instance: ProjectSunsettingService;
  private intervalId: NodeJS.Timeout | null = null;

  private constructor() {}

  public static getInstance(): ProjectSunsettingService {
    if (!ProjectSunsettingService.instance) {
      ProjectSunsettingService.instance = new ProjectSunsettingService();
    }
    return ProjectSunsettingService.instance;
  }

  public start(): void {
    if (this.intervalId) return;
    logger.info('ProjectSunsettingService: Starting decommissioning monitor');
    this.intervalId = setInterval(() => this.sunstetInactiveProjects(), 86400000); // Once per day
  }

  /**
   * Identifies and decommissions inactive projects (tenants).
   */
  public async sunstetInactiveProjects(): Promise<void> {
    logger.info('ProjectSunsetting: Running decommissioning scan...');
    const pool = getPostgresPool();

    try {
      // 1. Mark as STALLED (30 days inactivity)
      const stalledResult = await pool.query(`
        UPDATE tenants
        SET config = config || '{"lifecycle_status": "STALLED"}'::jsonb,
            updated_at = NOW()
        WHERE is_active = true
        AND updated_at < NOW() - INTERVAL '30 days'
        AND (config->>'lifecycle_status' IS NULL OR config->>'lifecycle_status' != 'STALLED')
        RETURNING id
      `);

      if (stalledResult.rows.length > 0) {
        logger.warn({ count: stalledResult.rows.length }, 'ProjectSunsetting: Marked tenants as STALLED');
      }

      // 2. Mark as ARCHIVED (60 days inactivity)
      const archivedResult = await pool.query(`
        UPDATE tenants
        SET config = config || '{"lifecycle_status": "ARCHIVED"}'::jsonb,
            is_active = false,
            updated_at = NOW()
        WHERE updated_at < NOW() - INTERVAL '60 days'
        AND (config->>'lifecycle_status' = 'STALLED')
        RETURNING id
      `);

      if (archivedResult.rows.length > 0) {
        logger.warn({ count: archivedResult.rows.length }, 'ProjectSunsetting: Archived inactive tenants');
      }

      logger.info('ProjectSunsetting: Scan complete');
    } catch (err: any) {
      logger.error({ err }, 'ProjectSunsetting: Error during decommissioning');
    }
  }
}

export const projectSunsettingService = ProjectSunsettingService.getInstance();
