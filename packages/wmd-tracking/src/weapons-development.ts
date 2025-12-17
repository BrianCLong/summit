/**
 * WMD Program Development Tracking
 */

import {
  type WeaponsDevelopment,
  ProgramStatus,
  type DevelopmentMilestone,
  type TechnicalCapability
} from './types.js';

export class WeaponsDevelopmentTracker {
  private programs: Map<string, WeaponsDevelopment>;

  constructor() {
    this.programs = new Map();
  }

  registerProgram(program: WeaponsDevelopment): void {
    this.programs.set(program.id, program);
  }

  updateMilestone(programId: string, milestone: DevelopmentMilestone): void {
    const program = this.programs.get(programId);
    if (!program) return;

    program.milestones.push(milestone);
    this.programs.set(programId, program);
  }

  getProgramsByCountry(country: string): WeaponsDevelopment[] {
    return Array.from(this.programs.values()).filter(p => p.country === country);
  }

  getActivePrograms(): WeaponsDevelopment[] {
    return Array.from(this.programs.values())
      .filter(p => p.status === ProgramStatus.ACTIVE || p.status === ProgramStatus.COVERT);
  }

  assessProgramMaturity(programId: string): {
    maturity_level: number; // 0-100
    achieved_milestones: number;
    total_milestones: number;
    estimated_completion?: string;
  } {
    const program = this.programs.get(programId);
    if (!program) {
      return { maturity_level: 0, achieved_milestones: 0, total_milestones: 0 };
    }

    const achieved = program.milestones.filter(m => m.achieved).length;
    const total = program.milestones.length;
    const maturity = total > 0 ? (achieved / total) * 100 : 0;

    return {
      maturity_level: maturity,
      achieved_milestones: achieved,
      total_milestones: total
    };
  }

  identifyKeyCapabilities(programId: string): string[] {
    const program = this.programs.get(programId);
    if (!program) return [];

    const capabilities: string[] = [];
    const tech = program.technical_capability;

    if (tech.design_capability) capabilities.push('Design');
    if (tech.production_capability) capabilities.push('Production');
    if (tech.testing_capability) capabilities.push('Testing');
    if (tech.deployment_capability) capabilities.push('Deployment');
    if (tech.miniaturization) capabilities.push('Miniaturization');

    return capabilities;
  }

  comparePrograms(programId1: string, programId2: string): {
    more_advanced: string;
    capability_gap: string[];
  } {
    const p1 = this.programs.get(programId1);
    const p2 = this.programs.get(programId2);

    if (!p1 || !p2) {
      return { more_advanced: 'unknown', capability_gap: [] };
    }

    const caps1 = this.identifyKeyCapabilities(programId1);
    const caps2 = this.identifyKeyCapabilities(programId2);

    const gap = caps1.filter(c => !caps2.includes(c));

    return {
      more_advanced: caps1.length > caps2.length ? programId1 : programId2,
      capability_gap: gap
    };
  }
}
