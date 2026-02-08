import { requireKnownMultiplier } from './copilotModelPolicy';

export function registerCopilotModelPolicyTests(): void {
  describe('copilot model policy', () => {
    test('deny-by-default when promo window active and multiplier missing', () => {
      expect(() =>
        requireKnownMultiplier(
          {
            id: 'anthropic/claude-opus-4.6-fast',
            state: 'preview',
            tiers: ['copilot_pro_plus', 'copilot_enterprise'],
            surfaces: ['vscode_agent', 'copilot_cli'],
            policyRequiredKeys: ['enable_fast_mode_opus_4_6'],
            promoWindow: {
              startISO: '2026-02-07T00:00:00Z',
              endISO: '2026-02-16T23:59:59Z',
            },
          },
          new Date('2026-02-10T12:00:00Z'),
        ),
      ).toThrow(/Unknown premium multiplier/);
    });

    test('allow when multiplier present during promo window', () => {
      expect(() =>
        requireKnownMultiplier(
          {
            id: 'anthropic/claude-opus-4.6-fast',
            state: 'preview',
            tiers: ['copilot_pro_plus', 'copilot_enterprise'],
            surfaces: ['vscode_agent', 'copilot_cli'],
            policyRequiredKeys: ['enable_fast_mode_opus_4_6'],
            premiumMultiplier: 9,
            promoWindow: {
              startISO: '2026-02-07T00:00:00Z',
              endISO: '2026-02-16T23:59:59Z',
            },
          },
          new Date('2026-02-10T12:00:00Z'),
        ),
      ).not.toThrow();
    });
  });
}
