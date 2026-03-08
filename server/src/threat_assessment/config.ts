export const THREAT_ASSESSMENT_ENABLED =
  process.env.SUMMIT_THREAT_ASSESSMENT_ENABLED === 'true';

export const EVIDENCE_ID_REGEX = /^EVID:[a-z0-9-]+:[A-Z0-9_]+:\d{3}$/;

export const CONTEXT_PRIORS: Record<string, number> = {
  domestic: 2.0,
  public_figure: 1.5,
  workplace: 1.2,
  school: 1.2,
  general: 1.4,
};
