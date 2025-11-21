/**
 * Treaty Verification Package
 *
 * Monitors compliance with nuclear nonproliferation treaties
 * including NPT, CTBT, CWC, BWC, and IAEA safeguards.
 */

export * from './types.js';
export * from './npt-monitor.js';
export * from './ctbt-monitor.js';
export * from './iaea-safeguards.js';
export * from './cwc-monitor.js';

export interface TreatyCompliance {
  country: string;
  treaty: Treaty;
  status: ComplianceStatus;
  ratification_date?: string;
  last_inspection?: string;
  violations: Violation[];
  confidence_level: 'high' | 'medium' | 'low';
  additional_notes?: string;
}

export enum Treaty {
  NPT = 'npt', // Nuclear Non-Proliferation Treaty
  CTBT = 'ctbt', // Comprehensive Test Ban Treaty
  CWC = 'cwc', // Chemical Weapons Convention
  BWC = 'bwc', // Biological Weapons Convention
  IAEA_SAFEGUARDS = 'iaea_safeguards',
  ADDITIONAL_PROTOCOL = 'additional_protocol',
  START = 'start', // Strategic Arms Reduction Treaty
  INF = 'inf' // Intermediate-Range Nuclear Forces
}

export enum ComplianceStatus {
  COMPLIANT = 'compliant',
  NON_COMPLIANT = 'non_compliant',
  PARTIAL_COMPLIANCE = 'partial_compliance',
  UNDER_REVIEW = 'under_review',
  NOT_PARTY = 'not_party',
  WITHDRAWN = 'withdrawn'
}

export interface Violation {
  id: string;
  treaty: Treaty;
  country: string;
  violation_type: string;
  date_identified: string;
  description: string;
  severity: 'critical' | 'major' | 'minor';
  resolved: boolean;
  resolution_date?: string;
  iaea_reported: boolean;
  unsc_action?: string;
}

export interface IAEASafeguards {
  country: string;
  safeguards_agreement: boolean;
  additional_protocol: boolean;
  declared_facilities: number;
  inspections_per_year: number;
  last_inspection: string;
  findings: SafeguardsFinding[];
  broader_conclusion: boolean; // All nuclear material in peaceful use
}

export interface SafeguardsFinding {
  inspection_id: string;
  facility_id: string;
  date: string;
  finding_type: 'no_concern' | 'anomaly' | 'discrepancy' | 'violation';
  description: string;
  resolved: boolean;
}

export class NPTMonitor {
  private compliance: Map<string, TreatyCompliance> = new Map();

  updateCompliance(data: TreatyCompliance): void {
    this.compliance.set(data.country, data);
  }

  getNonCompliantCountries(): TreatyCompliance[] {
    return Array.from(this.compliance.values())
      .filter(c => c.status === ComplianceStatus.NON_COMPLIANT);
  }

  getWithdrawals(): TreatyCompliance[] {
    return Array.from(this.compliance.values())
      .filter(c => c.status === ComplianceStatus.WITHDRAWN);
  }
}

export class CTBTMonitor {
  private detections: Map<string, any> = new Map();

  recordSeismicEvent(event: {
    id: string;
    location: { lat: number; lon: number };
    magnitude: number;
    date: string;
    potential_test: boolean;
  }): void {
    this.detections.set(event.id, event);
  }

  getPotentialViolations(): any[] {
    return Array.from(this.detections.values()).filter(d => d.potential_test);
  }
}

export class IAEASafeguardsMonitor {
  private safeguards: Map<string, IAEASafeguards> = new Map();

  updateSafeguards(data: IAEASafeguards): void {
    this.safeguards.set(data.country, data);
  }

  getCountriesWithBroaderConclusion(): string[] {
    return Array.from(this.safeguards.values())
      .filter(s => s.broader_conclusion)
      .map(s => s.country);
  }

  getCountriesWithoutAdditionalProtocol(): string[] {
    return Array.from(this.safeguards.values())
      .filter(s => !s.additional_protocol)
      .map(s => s.country);
  }
}

export class CWCMonitor {
  private compliance: Map<string, TreatyCompliance> = new Map();

  assessCompliance(country: string, data: {
    declared_stockpile: number;
    destroyed: number;
    facilities_declared: number;
  }): ComplianceStatus {
    const destruction_rate = data.declared_stockpile > 0 ?
      (data.destroyed / data.declared_stockpile) * 100 : 100;

    if (destruction_rate >= 90 && data.facilities_declared > 0) {
      return ComplianceStatus.COMPLIANT;
    } else if (destruction_rate >= 50) {
      return ComplianceStatus.PARTIAL_COMPLIANCE;
    }
    return ComplianceStatus.NON_COMPLIANT;
  }
}
