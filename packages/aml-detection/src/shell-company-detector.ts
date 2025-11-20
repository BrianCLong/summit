/**
 * Shell Company Detection
 */

import { Entity, AMLAlert, AMLTypology } from './types.js';

export class ShellCompanyDetector {
  async detectShellCompany(entity: Entity): Promise<number> {
    let riskScore = 0;

    // Check for shell company indicators
    if (entity.type === 'BUSINESS') {
      // Offshore jurisdiction
      if (this.isOffshoreJurisdiction(entity.jurisdiction)) riskScore += 25;

      // Minimal operational presence
      if (entity.relationships.length < 2) riskScore += 20;

      // Complex ownership structure
      const ownershipLayers = this.countOwnershipLayers(entity);
      if (ownershipLayers >= 3) riskScore += 30;

      // High-risk jurisdiction
      if (this.isHighRiskJurisdiction(entity.jurisdiction)) riskScore += 25;
    }

    return Math.min(riskScore, 100);
  }

  private isOffshoreJurisdiction(country: string): boolean {
    return ['KY', 'BM', 'VG', 'PA', 'BS'].includes(country);
  }

  private isHighRiskJurisdiction(country: string): boolean {
    return ['AF', 'IR', 'KP', 'SY'].includes(country);
  }

  private countOwnershipLayers(entity: Entity): number {
    // Simplified ownership layer counting
    return entity.relationships.filter(r => r.type === 'OWNER').length;
  }
}
