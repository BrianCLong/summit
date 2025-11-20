/**
 * Cyber Kill Chain Analysis
 * Implementation of Lockheed Martin's Cyber Kill Chain framework
 */

export enum KillChainPhase {
  RECONNAISSANCE = 'RECONNAISSANCE',
  WEAPONIZATION = 'WEAPONIZATION',
  DELIVERY = 'DELIVERY',
  EXPLOITATION = 'EXPLOITATION',
  INSTALLATION = 'INSTALLATION',
  COMMAND_AND_CONTROL = 'COMMAND_AND_CONTROL',
  ACTIONS_ON_OBJECTIVES = 'ACTIONS_ON_OBJECTIVES',
}

export interface KillChainActivity {
  id: string;
  phase: KillChainPhase;
  timestamp: string;
  description: string;

  // Technical details
  techniques: string[]; // MITRE ATT&CK techniques
  tools: string[];
  iocs: string[];

  // Context
  adversary?: string;
  campaign?: string;
  confidence: number; // 0-100

  // Detection
  detected: boolean;
  detectionMethod?: string;
  blocked: boolean;

  // Metadata
  metadata?: Record<string, any>;
}

export class KillChainAnalysis {
  private activities: Map<string, KillChainActivity> = new Map();

  /**
   * Add activity to kill chain
   */
  addActivity(activity: KillChainActivity): void {
    this.activities.set(activity.id, activity);
  }

  /**
   * Get activity by ID
   */
  getActivity(id: string): KillChainActivity | undefined {
    return this.activities.get(id);
  }

  /**
   * Get activities by phase
   */
  getActivitiesByPhase(phase: KillChainPhase): KillChainActivity[] {
    return Array.from(this.activities.values()).filter(
      activity => activity.phase === phase
    );
  }

  /**
   * Get activities by adversary
   */
  getActivitiesByAdversary(adversary: string): KillChainActivity[] {
    return Array.from(this.activities.values()).filter(
      activity => activity.adversary === adversary
    );
  }

  /**
   * Get activities by campaign
   */
  getActivitiesByCampaign(campaign: string): KillChainActivity[] {
    return Array.from(this.activities.values()).filter(
      activity => activity.campaign === campaign
    );
  }

  /**
   * Reconstruct attack timeline
   */
  reconstructTimeline(adversary?: string, campaign?: string): KillChainActivity[] {
    let activities = Array.from(this.activities.values());

    if (adversary) {
      activities = activities.filter(a => a.adversary === adversary);
    }

    if (campaign) {
      activities = activities.filter(a => a.campaign === campaign);
    }

    // Sort by timestamp
    return activities.sort((a, b) =>
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
  }

  /**
   * Analyze kill chain progression
   */
  analyzeProgression(adversary?: string, campaign?: string): {
    phases: Record<KillChainPhase, number>;
    timeline: KillChainActivity[];
    currentPhase: KillChainPhase | null;
    completionPercentage: number;
    blocked: boolean;
    detectionRate: number;
  } {
    const timeline = this.reconstructTimeline(adversary, campaign);

    // Count activities per phase
    const phases: Record<KillChainPhase, number> = {
      [KillChainPhase.RECONNAISSANCE]: 0,
      [KillChainPhase.WEAPONIZATION]: 0,
      [KillChainPhase.DELIVERY]: 0,
      [KillChainPhase.EXPLOITATION]: 0,
      [KillChainPhase.INSTALLATION]: 0,
      [KillChainPhase.COMMAND_AND_CONTROL]: 0,
      [KillChainPhase.ACTIONS_ON_OBJECTIVES]: 0,
    };

    let currentPhase: KillChainPhase | null = null;
    let blocked = false;
    let detectedCount = 0;

    for (const activity of timeline) {
      phases[activity.phase]++;

      // Track latest phase
      if (!currentPhase || this.getPhaseOrder(activity.phase) > this.getPhaseOrder(currentPhase)) {
        currentPhase = activity.phase;
      }

      if (activity.blocked) {
        blocked = true;
      }

      if (activity.detected) {
        detectedCount++;
      }
    }

    const completionPercentage = currentPhase
      ? ((this.getPhaseOrder(currentPhase) + 1) / 7) * 100
      : 0;

    const detectionRate = timeline.length > 0
      ? (detectedCount / timeline.length) * 100
      : 0;

    return {
      phases,
      timeline,
      currentPhase,
      completionPercentage,
      blocked,
      detectionRate,
    };
  }

  /**
   * Get phase order
   */
  private getPhaseOrder(phase: KillChainPhase): number {
    const order: Record<KillChainPhase, number> = {
      [KillChainPhase.RECONNAISSANCE]: 0,
      [KillChainPhase.WEAPONIZATION]: 1,
      [KillChainPhase.DELIVERY]: 2,
      [KillChainPhase.EXPLOITATION]: 3,
      [KillChainPhase.INSTALLATION]: 4,
      [KillChainPhase.COMMAND_AND_CONTROL]: 5,
      [KillChainPhase.ACTIONS_ON_OBJECTIVES]: 6,
    };

    return order[phase];
  }

  /**
   * Identify gaps in detection
   */
  identifyDetectionGaps(): {
    phase: KillChainPhase;
    detectionRate: number;
    activityCount: number;
  }[] {
    const gaps: Array<{
      phase: KillChainPhase;
      detectionRate: number;
      activityCount: number;
    }> = [];

    for (const phase of Object.values(KillChainPhase)) {
      const activities = this.getActivitiesByPhase(phase);
      const detected = activities.filter(a => a.detected).length;
      const detectionRate = activities.length > 0
        ? (detected / activities.length) * 100
        : 0;

      gaps.push({
        phase,
        detectionRate,
        activityCount: activities.length,
      });
    }

    // Sort by lowest detection rate
    return gaps.sort((a, b) => a.detectionRate - b.detectionRate);
  }

  /**
   * Generate defensive recommendations
   */
  generateDefensiveRecommendations(adversary?: string): {
    phase: KillChainPhase;
    recommendation: string;
    priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  }[] {
    const progression = this.analyzeProgression(adversary);
    const recommendations: Array<{
      phase: KillChainPhase;
      recommendation: string;
      priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
    }> = [];

    // Recommend based on current phase
    if (progression.currentPhase) {
      const phaseOrder = this.getPhaseOrder(progression.currentPhase);

      // Recommend controls for current and next phases
      for (let i = phaseOrder; i < phaseOrder + 2 && i < 7; i++) {
        const phase = this.getPhaseByOrder(i);
        const rec = this.getPhaseRecommendation(phase);

        recommendations.push({
          phase,
          recommendation: rec,
          priority: i === phaseOrder ? 'CRITICAL' : 'HIGH',
        });
      }
    }

    // Add recommendations for gaps
    const gaps = this.identifyDetectionGaps();
    for (const gap of gaps.slice(0, 3)) { // Top 3 gaps
      if (gap.detectionRate < 50) {
        recommendations.push({
          phase: gap.phase,
          recommendation: `Improve detection for ${gap.phase} phase (current rate: ${gap.detectionRate.toFixed(1)}%)`,
          priority: gap.detectionRate < 25 ? 'CRITICAL' : 'HIGH',
        });
      }
    }

    return recommendations;
  }

  /**
   * Get phase by order
   */
  private getPhaseByOrder(order: number): KillChainPhase {
    const phases: KillChainPhase[] = [
      KillChainPhase.RECONNAISSANCE,
      KillChainPhase.WEAPONIZATION,
      KillChainPhase.DELIVERY,
      KillChainPhase.EXPLOITATION,
      KillChainPhase.INSTALLATION,
      KillChainPhase.COMMAND_AND_CONTROL,
      KillChainPhase.ACTIONS_ON_OBJECTIVES,
    ];

    return phases[order];
  }

  /**
   * Get phase recommendation
   */
  private getPhaseRecommendation(phase: KillChainPhase): string {
    const recommendations: Record<KillChainPhase, string> = {
      [KillChainPhase.RECONNAISSANCE]: 'Monitor for suspicious reconnaissance activities, implement deception technologies',
      [KillChainPhase.WEAPONIZATION]: 'Threat intelligence sharing, analyze malware samples',
      [KillChainPhase.DELIVERY]: 'Email filtering, web filtering, endpoint protection',
      [KillChainPhase.EXPLOITATION]: 'Patch management, vulnerability scanning, IPS/IDS',
      [KillChainPhase.INSTALLATION]: 'Application whitelisting, endpoint detection, file integrity monitoring',
      [KillChainPhase.COMMAND_AND_CONTROL]: 'Network monitoring, DNS filtering, C2 blocking',
      [KillChainPhase.ACTIONS_ON_OBJECTIVES]: 'Data loss prevention, privileged account monitoring, anomaly detection',
    };

    return recommendations[phase];
  }

  /**
   * Map MITRE ATT&CK to Kill Chain
   */
  mapMitreToKillChain(mitreId: string): KillChainPhase | null {
    // Simplified mapping - in production, use official mapping
    const tacticMapping: Record<string, KillChainPhase> = {
      'TA0043': KillChainPhase.RECONNAISSANCE, // Reconnaissance
      'TA0042': KillChainPhase.RECONNAISSANCE, // Resource Development → Weaponization
      'TA0001': KillChainPhase.DELIVERY, // Initial Access
      'TA0002': KillChainPhase.EXPLOITATION, // Execution
      'TA0003': KillChainPhase.INSTALLATION, // Persistence
      'TA0004': KillChainPhase.INSTALLATION, // Privilege Escalation
      'TA0005': KillChainPhase.INSTALLATION, // Defense Evasion
      'TA0011': KillChainPhase.COMMAND_AND_CONTROL, // Command and Control
      'TA0006': KillChainPhase.ACTIONS_ON_OBJECTIVES, // Credential Access
      'TA0007': KillChainPhase.ACTIONS_ON_OBJECTIVES, // Discovery
      'TA0008': KillChainPhase.ACTIONS_ON_OBJECTIVES, // Lateral Movement
      'TA0009': KillChainPhase.ACTIONS_ON_OBJECTIVES, // Collection
      'TA0010': KillChainPhase.ACTIONS_ON_OBJECTIVES, // Exfiltration
      'TA0040': KillChainPhase.ACTIONS_ON_OBJECTIVES, // Impact
    };

    return tacticMapping[mitreId] || null;
  }

  /**
   * Export to timeline format
   */
  exportTimeline(adversary?: string, campaign?: string): {
    event: string;
    timestamp: string;
    phase: KillChainPhase;
    detected: boolean;
    blocked: boolean;
  }[] {
    const timeline = this.reconstructTimeline(adversary, campaign);

    return timeline.map(activity => ({
      event: activity.description,
      timestamp: activity.timestamp,
      phase: activity.phase,
      detected: activity.detected,
      blocked: activity.blocked,
    }));
  }

  /**
   * Get all activities
   */
  getAllActivities(): KillChainActivity[] {
    return Array.from(this.activities.values());
  }

  /**
   * Clear all data
   */
  clear(): void {
    this.activities.clear();
  }
}
