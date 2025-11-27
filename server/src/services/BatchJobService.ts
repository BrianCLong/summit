import PgBoss from 'pg-boss';
import { cfg } from '../config';

/**
 * @class BatchJobService
 * @description Manages background job processing with pg-boss.
 *
 * This singleton service initializes and configures pg-boss, registers job
 * processors, and schedules recurring tasks.
 */
class BatchJobService {
  private static instance: BatchJobService;
  public boss: PgBoss;

  private constructor() {
    this.boss = new PgBoss(cfg.DATABASE_URL);
    this.boss.on('error', error => console.error(`[PG-BOSS] Error: ${error.message}`));
  }

  public static getInstance(): BatchJobService {
    if (!BatchJobService.instance) {
      BatchJobService.instance = new BatchJobService();
    }
    return BatchJobService.instance;
  }

  /**
   * Starts the job processor and schedules recurring jobs.
   */
  public async start() {
    await this.boss.start();
    console.log('[PG-BOSS] Job processor started.');
    await this.scheduleJobs();
  }

  /**
   * Registers and schedules all recurring jobs for the application.
   */
  private async scheduleJobs() {
    // Unschedule existing jobs to prevent duplicates during restarts
    await this.boss.unschedule('generate-soc2-evidence');

    // Schedule the SOC2 evidence generation job to run on the 1st of every month
    // cron: <minutes> <hours> <days of month> <months> <days of week>
    const cron = '0 3 1 * *'; // At 03:00 on day-of-month 1
    await this.boss.schedule('generate-soc2-evidence', cron);
    console.log(`[PG-BOSS] Scheduled job 'generate-soc2-evidence' with cron: ${cron}`);
  }

  /**
   * Stops the job processor gracefully.
   */
  public async stop() {
    await this.boss.stop();
    console.log('[PG-BOSS] Job processor stopped.');
  }
}

export default BatchJobService.getInstance();
