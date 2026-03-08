import { RiskLevel } from './types';

const RECS: Record<RiskLevel, string[]> = {
  LOW: ['monitor_case', 'collect_missing_facts'],
  GUARDED: ['watchlist_case', 'collect_corrob_evidence'],
  ELEVATED: ['analyst_escalation', 'target_hardening_review'],
  HIGH: ['analyst_review_urgent', 'access_control_check'],
  CRITICAL: ['incident_command_playbook', 'immediate_protective_review'],
  REVIEW_REQUIRED: ['manual_review_required'],
};

export function getRecommendations(level: RiskLevel): string[] {
  return RECS[level];
}
