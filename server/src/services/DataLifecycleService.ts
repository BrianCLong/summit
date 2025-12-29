import { regionalConfigService } from './RegionalConfigService.js';
import logger from '../utils/logger.js';

export class DataLifecycleService {
  private static instance: DataLifecycleService;

  private constructor() {}

  public static getInstance(): DataLifecycleService {
    if (!DataLifecycleService.instance) {
      DataLifecycleService.instance = new DataLifecycleService();
    }
    return DataLifecycleService.instance;
  }

  /**
   * Checks if data should be retained based on its age and the country's policy.
   */
  public isRetentionCompliant(countryCode: string, dataCreationDate: Date): boolean {
    const config = regionalConfigService.getConfig(countryCode);
    const retentionYears = config.privacy.retentionYears;

    const cutoffDate = new Date();
    cutoffDate.setFullYear(cutoffDate.getFullYear() - retentionYears);

    return dataCreationDate >= cutoffDate;
  }

  /**
   * Enforces data minimization by checking if optional fields are allowed.
   * Returns a filtered object containing only allowed fields.
   */
  public enforceMinimization<T extends Record<string, any>>(countryCode: string, data: T, optionalFields: (keyof T)[]): T {
    const config = regionalConfigService.getConfig(countryCode);

    if (!config.privacy.dataMinimization) {
      return data;
    }

    const filteredData = { ...data };
    for (const field of optionalFields) {
      delete filteredData[field];
    }
    return filteredData;
  }

  /**
   * Simulates a scheduled job that checks for expired data.
   * In a real implementation, this would query the DB.
   */
  public async checkExpiredData(countryCode: string): Promise<number> {
    const config = regionalConfigService.getConfig(countryCode);
    logger.info(`Checking for expired data in ${countryCode} (Retention: ${config.privacy.retentionYears} years)`);

    // Simulate finding expired records
    // In reality: DELETE FROM records WHERE created_at < cutoff AND tenant_country = countryCode
    return 0;
  }
}

export const dataLifecycleService = DataLifecycleService.getInstance();
