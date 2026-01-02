import logger from '../../config/logger.js';
import { Pool } from 'pg';
import { CaseOverviewService, CaseOverviewOptions } from './CaseOverviewService.js';
import { CaseOverviewCacheRepo } from '../../repos/CaseOverviewCacheRepo.js';

const refreshLogger = logger.child({ name: 'CaseOverviewRefreshJob' });

export interface CaseOverviewRefreshResult {
  attempted: number;
  refreshed: number;
}

export class CaseOverviewRefreshJob {
  private service: CaseOverviewService;
  private cacheRepo: CaseOverviewCacheRepo;

  constructor(pg: Pool, options?: CaseOverviewOptions) {
    this.service = new CaseOverviewService(pg, options);
    this.cacheRepo = new CaseOverviewCacheRepo(pg);
  }

  async run(limit = 50): Promise<CaseOverviewRefreshResult> {
    const candidates = await this.cacheRepo.listCasesNeedingRefresh(limit);
    let refreshed = 0;

    for (const candidate of candidates) {
      try {
        await this.service.refresh(candidate.caseId, candidate.tenantId);
        refreshed += 1;
      } catch (error: any) {
        refreshLogger.warn(
          { error: (error as Error).message, caseId: candidate.caseId, tenantId: candidate.tenantId },
          'Failed to refresh case overview cache entry',
        );
      }
    }

    return { attempted: candidates.length, refreshed };
  }
}
