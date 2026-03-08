import { ThreatContext } from './types';

export interface ContextPack {
  id: ThreatContext;
  prior: number;
  requiredFamilies: string[];
  spotlightIndicators: string[];
}

export const CONTEXT_PACKS: Record<ThreatContext, ContextPack> = {
  domestic: {
    id: 'domestic',
    prior: 2.0,
    requiredFamilies: ['threat_communications', 'history', 'context_amplifiers'],
    spotlightIndicators: ['TA_CTX_001', 'TA_CTX_002', 'TA_HISTORY_005'],
  },
  public_figure: {
    id: 'public_figure',
    prior: 1.5,
    requiredFamilies: ['fixation', 'approach', 'context_amplifiers'],
    spotlightIndicators: ['TA_CTX_003', 'TA_FIXATION_003', 'TA_APPROACH_004'],
  },
  workplace: {
    id: 'workplace',
    prior: 1.2,
    requiredFamilies: ['history', 'triggering_stressors', 'context_amplifiers'],
    spotlightIndicators: ['TA_CTX_005', 'TA_TRIGGER_002', 'TA_HISTORY_008'],
  },
  school: {
    id: 'school',
    prior: 1.2,
    requiredFamilies: ['planning', 'triggering_stressors', 'context_amplifiers'],
    spotlightIndicators: ['TA_CTX_004', 'TA_PLAN_010', 'TA_TRIGGER_012'],
  },
  general: {
    id: 'general',
    prior: 1.4,
    requiredFamilies: ['threat_communications', 'escalation'],
    spotlightIndicators: ['TA_COMM_001', 'TA_ESC_003', 'TA_APPROACH_001'],
  },
};
