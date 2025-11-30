import { describe, it, expect, beforeEach } from 'vitest';
import {
  getPolicyForClassification,
  isTranslationAllowed,
  mergePolicies,
  DEFAULT_POLICY,
  NO_TRANSLATION_POLICY,
} from '../config/translation-policies';

describe('Translation Policies', () => {
  describe('getPolicyForClassification', () => {
    it('should return default policy for no classification tags', () => {
      const policy = getPolicyForClassification([]);
      expect(policy).toEqual(DEFAULT_POLICY);
    });

    it('should return permissive policy for UNCLASSIFIED', () => {
      const policy = getPolicyForClassification(['UNCLASSIFIED']);
      expect(policy.allowTranslation).toBe(true);
      expect(policy.allowCrossBorderTransfer).toBe(true);
    });

    it('should restrict cross-border transfer for CUI', () => {
      const policy = getPolicyForClassification(['CUI']);
      expect(policy.allowTranslation).toBe(true);
      expect(policy.allowCrossBorderTransfer).toBe(false);
    });

    it('should disallow translation for classified content', () => {
      const policy = getPolicyForClassification(['SECRET']);
      expect(policy.allowTranslation).toBe(false);
    });

    it('should use most restrictive policy for multiple tags', () => {
      const policy = getPolicyForClassification(['UNCLASSIFIED', 'CUI']);
      expect(policy.allowCrossBorderTransfer).toBe(false);
    });

    it('should disallow translation if any tag is classified', () => {
      const policy = getPolicyForClassification(['UNCLASSIFIED', 'SECRET']);
      expect(policy.allowTranslation).toBe(false);
    });
  });

  describe('isTranslationAllowed', () => {
    it('should allow translation with default policy', () => {
      const result = isTranslationAllowed(DEFAULT_POLICY, 'fr');
      expect(result.allowed).toBe(true);
    });

    it('should deny translation with no-translation policy', () => {
      const result = isTranslationAllowed(NO_TRANSLATION_POLICY, 'fr');
      expect(result.allowed).toBe(false);
      expect(result.reason).toBeDefined();
    });

    it('should deny forbidden languages', () => {
      const policy = {
        allowTranslation: true,
        forbiddenTargetLanguages: ['ru', 'zh'],
      };
      const result = isTranslationAllowed(policy, 'ru');
      expect(result.allowed).toBe(false);
    });

    it('should allow only allowed languages', () => {
      const policy = {
        allowTranslation: true,
        allowedTargetLanguages: ['en', 'fr', 'de'],
      };

      expect(isTranslationAllowed(policy, 'fr').allowed).toBe(true);
      expect(isTranslationAllowed(policy, 'zh').allowed).toBe(false);
    });
  });

  describe('mergePolicies', () => {
    it('should return default for empty array', () => {
      const merged = mergePolicies([]);
      expect(merged).toEqual(DEFAULT_POLICY);
    });

    it('should return single policy unchanged', () => {
      const policy = { allowTranslation: true };
      const merged = mergePolicies([policy]);
      expect(merged).toEqual(policy);
    });

    it('should use most restrictive policy', () => {
      const policies = [
        { allowTranslation: true, allowCrossBorderTransfer: true },
        { allowTranslation: true, allowCrossBorderTransfer: false },
      ];
      const merged = mergePolicies(policies);
      expect(merged.allowCrossBorderTransfer).toBe(false);
    });

    it('should disallow translation if any policy disallows', () => {
      const policies = [
        { allowTranslation: true },
        { allowTranslation: false, reason: 'Classified' },
      ];
      const merged = mergePolicies(policies);
      expect(merged.allowTranslation).toBe(false);
    });
  });
});
