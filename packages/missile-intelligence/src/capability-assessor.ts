/**
 * Missile Capability Assessment
 */

import { type MissileCapability, type MissileSystem, MissileType } from './types.js';

export class MissileCapabilityAssessor {
  assessCountryCapability(
    country: string,
    missiles: MissileSystem[]
  ): MissileCapability {
    const icbms = missiles.filter(m => m.missile_type === MissileType.BALLISTIC_ICBM);
    const slbms = missiles.filter(m => m.submarine_launched);
    const cruise = missiles.filter(m =>
      m.missile_type === MissileType.CRUISE_GROUND ||
      m.missile_type === MissileType.CRUISE_AIR ||
      m.missile_type === MissileType.CRUISE_SEA
    );
    const hypersonic = missiles.filter(m =>
      m.missile_type === MissileType.HYPERSONIC_GLIDE ||
      m.missile_type === MissileType.HYPERSONIC_CRUISE
    );

    const mobile = missiles.filter(m => m.mobile).reduce((sum, m) => sum + m.estimated_inventory, 0);
    const mirv = missiles.some(m => m.mirv_capable);
    const strategic = icbms.length > 0 || slbms.length > 0;

    // Second strike: survivable forces (mobile, submarine)
    const second_strike = slbms.length > 0 || mobile > 20;

    // First strike: accurate, large arsenal
    const first_strike = icbms.reduce((sum, m) => sum + m.estimated_inventory, 0) > 100;

    let overall_assessment: 'advanced' | 'intermediate' | 'developing' | 'nascent';
    if (strategic && mirv && hypersonic.length > 0) {
      overall_assessment = 'advanced';
    } else if (strategic || hypersonic.length > 0) {
      overall_assessment = 'intermediate';
    } else if (missiles.length > 10) {
      overall_assessment = 'developing';
    } else {
      overall_assessment = 'nascent';
    }

    return {
      country,
      strategic_capability: strategic,
      icbm_count: icbms.reduce((sum, m) => sum + m.estimated_inventory, 0),
      slbm_count: slbms.reduce((sum, m) => sum + m.estimated_inventory, 0),
      cruise_missile_count: cruise.reduce((sum, m) => sum + m.estimated_inventory, 0),
      hypersonic_capability: hypersonic.length > 0,
      mirv_capability: mirv,
      mobile_launchers: mobile,
      submarine_platforms: slbms.length,
      second_strike_capability: second_strike,
      first_strike_capability: first_strike,
      overall_assessment
    };
  }

  compareCapabilities(cap1: MissileCapability, cap2: MissileCapability): {
    more_advanced: string;
    advantages: Record<string, string>;
  } {
    const advantages: Record<string, string> = {};

    if (cap1.icbm_count > cap2.icbm_count) {
      advantages.icbm = cap1.country;
    } else if (cap2.icbm_count > cap1.icbm_count) {
      advantages.icbm = cap2.country;
    }

    if (cap1.hypersonic_capability && !cap2.hypersonic_capability) {
      advantages.hypersonic = cap1.country;
    } else if (cap2.hypersonic_capability && !cap1.hypersonic_capability) {
      advantages.hypersonic = cap2.country;
    }

    const score1 = this.calculateCapabilityScore(cap1);
    const score2 = this.calculateCapabilityScore(cap2);

    return {
      more_advanced: score1 > score2 ? cap1.country : cap2.country,
      advantages
    };
  }

  private calculateCapabilityScore(cap: MissileCapability): number {
    let score = 0;
    score += cap.icbm_count * 5;
    score += cap.slbm_count * 6; // More survivable
    score += cap.cruise_missile_count * 1;
    score += cap.hypersonic_capability ? 50 : 0;
    score += cap.mirv_capability ? 30 : 0;
    score += cap.second_strike_capability ? 40 : 0;
    return score;
  }
}
