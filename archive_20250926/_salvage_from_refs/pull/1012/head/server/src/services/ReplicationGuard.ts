import type { Region } from '../region/RegionRouter';
import { ResidencyService } from './ResidencyService';

export class ReplicationGuard {
  constructor(private residency: ResidencyService) {}

  enforce(tenantId: string, target: Region): void {
    const allowed = this.residency.allowedRegions(tenantId);
    if (!allowed.includes(target)) {
      throw new Error('residency_blocked');
    }
  }
}
