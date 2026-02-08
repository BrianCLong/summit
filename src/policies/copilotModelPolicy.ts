export type CopilotModelTier =
  | 'copilot_pro_plus'
  | 'copilot_enterprise'
  | 'unknown';

export type CopilotModelState = 'preview' | 'ga' | 'retired' | 'unknown';

export type CopilotModelProfile = {
  id: string;
  state: CopilotModelState;
  tiers: CopilotModelTier[];
  surfaces: string[];
  policyRequiredKeys: string[];
  premiumMultiplier?: number;
  promoWindow?: { startISO: string; endISO: string };
};

export const isPromoWindowActive = (
  now: Date,
  window?: { startISO: string; endISO: string },
): boolean => {
  if (!window) {
    return false;
  }
  const start = new Date(window.startISO).getTime();
  const end = new Date(window.endISO).getTime();
  const current = now.getTime();
  return current >= start && current <= end;
};

export const requireKnownMultiplier = (
  profile: CopilotModelProfile,
  now: Date,
): void => {
  if (profile.promoWindow && isPromoWindowActive(now, profile.promoWindow)) {
    if (!profile.premiumMultiplier) {
      throw new Error(
        `Unknown premium multiplier during promo window for ${profile.id}`,
      );
    }
  }
};
