"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const translation_policies_1 = require("../config/translation-policies");
(0, vitest_1.describe)('Translation Policies', () => {
    (0, vitest_1.describe)('getPolicyForClassification', () => {
        (0, vitest_1.it)('should return default policy for no classification tags', () => {
            const policy = (0, translation_policies_1.getPolicyForClassification)([]);
            (0, vitest_1.expect)(policy).toEqual(translation_policies_1.DEFAULT_POLICY);
        });
        (0, vitest_1.it)('should return permissive policy for UNCLASSIFIED', () => {
            const policy = (0, translation_policies_1.getPolicyForClassification)(['UNCLASSIFIED']);
            (0, vitest_1.expect)(policy.allowTranslation).toBe(true);
            (0, vitest_1.expect)(policy.allowCrossBorderTransfer).toBe(true);
        });
        (0, vitest_1.it)('should restrict cross-border transfer for CUI', () => {
            const policy = (0, translation_policies_1.getPolicyForClassification)(['CUI']);
            (0, vitest_1.expect)(policy.allowTranslation).toBe(true);
            (0, vitest_1.expect)(policy.allowCrossBorderTransfer).toBe(false);
        });
        (0, vitest_1.it)('should disallow translation for classified content', () => {
            const policy = (0, translation_policies_1.getPolicyForClassification)(['SECRET']);
            (0, vitest_1.expect)(policy.allowTranslation).toBe(false);
        });
        (0, vitest_1.it)('should use most restrictive policy for multiple tags', () => {
            const policy = (0, translation_policies_1.getPolicyForClassification)(['UNCLASSIFIED', 'CUI']);
            (0, vitest_1.expect)(policy.allowCrossBorderTransfer).toBe(false);
        });
        (0, vitest_1.it)('should disallow translation if any tag is classified', () => {
            const policy = (0, translation_policies_1.getPolicyForClassification)(['UNCLASSIFIED', 'SECRET']);
            (0, vitest_1.expect)(policy.allowTranslation).toBe(false);
        });
    });
    (0, vitest_1.describe)('isTranslationAllowed', () => {
        (0, vitest_1.it)('should allow translation with default policy', () => {
            const result = (0, translation_policies_1.isTranslationAllowed)(translation_policies_1.DEFAULT_POLICY, 'fr');
            (0, vitest_1.expect)(result.allowed).toBe(true);
        });
        (0, vitest_1.it)('should deny translation with no-translation policy', () => {
            const result = (0, translation_policies_1.isTranslationAllowed)(translation_policies_1.NO_TRANSLATION_POLICY, 'fr');
            (0, vitest_1.expect)(result.allowed).toBe(false);
            (0, vitest_1.expect)(result.reason).toBeDefined();
        });
        (0, vitest_1.it)('should deny forbidden languages', () => {
            const policy = {
                allowTranslation: true,
                forbiddenTargetLanguages: ['ru', 'zh'],
            };
            const result = (0, translation_policies_1.isTranslationAllowed)(policy, 'ru');
            (0, vitest_1.expect)(result.allowed).toBe(false);
        });
        (0, vitest_1.it)('should allow only allowed languages', () => {
            const policy = {
                allowTranslation: true,
                allowedTargetLanguages: ['en', 'fr', 'de'],
            };
            (0, vitest_1.expect)((0, translation_policies_1.isTranslationAllowed)(policy, 'fr').allowed).toBe(true);
            (0, vitest_1.expect)((0, translation_policies_1.isTranslationAllowed)(policy, 'zh').allowed).toBe(false);
        });
    });
    (0, vitest_1.describe)('mergePolicies', () => {
        (0, vitest_1.it)('should return default for empty array', () => {
            const merged = (0, translation_policies_1.mergePolicies)([]);
            (0, vitest_1.expect)(merged).toEqual(translation_policies_1.DEFAULT_POLICY);
        });
        (0, vitest_1.it)('should return single policy unchanged', () => {
            const policy = { allowTranslation: true };
            const merged = (0, translation_policies_1.mergePolicies)([policy]);
            (0, vitest_1.expect)(merged).toEqual(policy);
        });
        (0, vitest_1.it)('should use most restrictive policy', () => {
            const policies = [
                { allowTranslation: true, allowCrossBorderTransfer: true },
                { allowTranslation: true, allowCrossBorderTransfer: false },
            ];
            const merged = (0, translation_policies_1.mergePolicies)(policies);
            (0, vitest_1.expect)(merged.allowCrossBorderTransfer).toBe(false);
        });
        (0, vitest_1.it)('should disallow translation if any policy disallows', () => {
            const policies = [
                { allowTranslation: true },
                { allowTranslation: false, reason: 'Classified' },
            ];
            const merged = (0, translation_policies_1.mergePolicies)(policies);
            (0, vitest_1.expect)(merged.allowTranslation).toBe(false);
        });
    });
});
