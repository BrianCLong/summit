/**
 * Security Controls Simulation
 *
 * Models defensive controls and their effectiveness against attack techniques.
 */

/** Security control definition */
export interface SecurityControl {
  id: string;
  name: string;
  description: string;
  category: ControlCategory;
  /** MITRE techniques this control mitigates */
  mitigates: string[];
  /** Effectiveness score 0-1 */
  effectiveness: number;
  /** Is control currently enabled */
  enabled: boolean;
}

/** Control categories */
export type ControlCategory =
  | 'preventive'
  | 'detective'
  | 'corrective'
  | 'deterrent';

/** Built-in security controls */
export const securityControls: SecurityControl[] = [
  {
    id: 'ctrl-mfa',
    name: 'Multi-Factor Authentication',
    description: 'Requires additional authentication factor beyond password',
    category: 'preventive',
    mitigates: ['T1078', 'T1110', 'T1556'],
    effectiveness: 0.9,
    enabled: true,
  },
  {
    id: 'ctrl-conditional-access',
    name: 'Conditional Access Policies',
    description: 'Context-aware access control based on risk signals',
    category: 'preventive',
    mitigates: ['T1078', 'T1110'],
    effectiveness: 0.8,
    enabled: true,
  },
  {
    id: 'ctrl-edr',
    name: 'Endpoint Detection and Response',
    description: 'Monitors and responds to endpoint threats',
    category: 'detective',
    mitigates: ['T1059', 'T1003', 'T1547'],
    effectiveness: 0.85,
    enabled: true,
  },
  {
    id: 'ctrl-network-segmentation',
    name: 'Network Segmentation',
    description: 'Isolates network zones to limit lateral movement',
    category: 'preventive',
    mitigates: ['T1021', 'T1570'],
    effectiveness: 0.75,
    enabled: true,
  },
  {
    id: 'ctrl-dlp',
    name: 'Data Loss Prevention',
    description: 'Monitors and blocks unauthorized data transfers',
    category: 'detective',
    mitigates: ['T1048', 'T1041', 'T1567'],
    effectiveness: 0.7,
    enabled: true,
  },
  {
    id: 'ctrl-encryption',
    name: 'Data Encryption',
    description: 'Encrypts data at rest and in transit',
    category: 'preventive',
    mitigates: ['T1005', 'T1039', 'T1530'],
    effectiveness: 0.95,
    enabled: true,
  },
  {
    id: 'ctrl-cloudtrail',
    name: 'Cloud Audit Logging',
    description: 'Comprehensive logging of cloud API activity',
    category: 'detective',
    mitigates: ['T1078.004', 'T1098'],
    effectiveness: 0.9,
    enabled: true,
  },
  {
    id: 'ctrl-siem',
    name: 'Security Information and Event Management',
    description: 'Centralized log analysis and alerting',
    category: 'detective',
    mitigates: ['*'],
    effectiveness: 0.75,
    enabled: true,
  },
];

/** Control simulation result */
export interface ControlSimulationResult {
  technique: string;
  controlsEvaluated: string[];
  blocked: boolean;
  detected: boolean;
  blockingControls: string[];
  detectingControls: string[];
  residualRisk: number;
}

/** Simulate control effectiveness against a technique */
export function simulateControls(
  technique: string,
  activeControls: SecurityControl[]
): ControlSimulationResult {
  const result: ControlSimulationResult = {
    technique,
    controlsEvaluated: [],
    blocked: false,
    detected: false,
    blockingControls: [],
    detectingControls: [],
    residualRisk: 1.0,
  };

  let cumulativeBlockProbability = 0;
  let cumulativeDetectProbability = 0;

  for (const control of activeControls) {
    if (!control.enabled) continue;

    const mitigates =
      control.mitigates.includes(technique) || control.mitigates.includes('*');

    if (mitigates) {
      result.controlsEvaluated.push(control.id);

      if (control.category === 'preventive') {
        cumulativeBlockProbability =
          1 - (1 - cumulativeBlockProbability) * (1 - control.effectiveness);
        if (Math.random() < control.effectiveness) {
          result.blockingControls.push(control.id);
        }
      } else if (control.category === 'detective') {
        cumulativeDetectProbability =
          1 - (1 - cumulativeDetectProbability) * (1 - control.effectiveness);
        if (Math.random() < control.effectiveness) {
          result.detectingControls.push(control.id);
        }
      }
    }
  }

  result.blocked = result.blockingControls.length > 0;
  result.detected = result.detectingControls.length > 0;
  result.residualRisk = (1 - cumulativeBlockProbability) * (1 - cumulativeDetectProbability * 0.5);

  return result;
}

/** Evaluate controls against a campaign */
export function evaluateCampaignControls(
  techniques: string[],
  controls: SecurityControl[]
): {
  results: ControlSimulationResult[];
  overallBlocked: boolean;
  overallDetected: boolean;
  avgResidualRisk: number;
} {
  const results = techniques.map((t) => simulateControls(t, controls));

  return {
    results,
    overallBlocked: results.some((r) => r.blocked),
    overallDetected: results.some((r) => r.detected),
    avgResidualRisk:
      results.reduce((sum, r) => sum + r.residualRisk, 0) / results.length,
  };
}

/** Get controls by category */
export function getControlsByCategory(
  category: ControlCategory
): SecurityControl[] {
  return securityControls.filter((c) => c.category === category);
}

/** Get controls that mitigate a technique */
export function getControlsForTechnique(technique: string): SecurityControl[] {
  return securityControls.filter(
    (c) => c.mitigates.includes(technique) || c.mitigates.includes('*')
  );
}
