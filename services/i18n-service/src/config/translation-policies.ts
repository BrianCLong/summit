import type { TranslationPolicy, LanguageCode } from '../types/index.js';

/**
 * Default translation policy (permissive)
 */
export const DEFAULT_POLICY: TranslationPolicy = {
  allowTranslation: true,
  allowCrossBorderTransfer: true,
};

/**
 * Restricted policy (no translation allowed)
 */
export const NO_TRANSLATION_POLICY: TranslationPolicy = {
  allowTranslation: false,
  reason: 'Translation not permitted for this content',
};

/**
 * Classification-based policies
 * Maps classification tags to translation policies
 */
export const CLASSIFICATION_POLICIES: Record<string, TranslationPolicy> = {
  // Unclassified - full translation allowed
  UNCLASSIFIED: {
    allowTranslation: true,
    allowCrossBorderTransfer: true,
  },

  // CUI (Controlled Unclassified Information) - restricted translation
  CUI: {
    allowTranslation: true,
    allowCrossBorderTransfer: false,
    reason: 'CUI content - no cross-border transfer',
  },

  // Law Enforcement Sensitive - restricted
  'LAW_ENFORCEMENT_SENSITIVE': {
    allowTranslation: true,
    allowCrossBorderTransfer: false,
    forbiddenTargetLanguages: [], // Can be configured per deployment
    reason: 'Law enforcement sensitive content',
  },

  // For Official Use Only
  FOUO: {
    allowTranslation: true,
    allowCrossBorderTransfer: false,
    reason: 'For official use only',
  },

  // Classified - no translation
  CONFIDENTIAL: {
    allowTranslation: false,
    reason: 'Classified content cannot be translated',
  },

  SECRET: {
    allowTranslation: false,
    reason: 'Classified content cannot be translated',
  },

  'TOP_SECRET': {
    allowTranslation: false,
    reason: 'Classified content cannot be translated',
  },

  // Personal data - restricted for privacy
  PII: {
    allowTranslation: true,
    allowCrossBorderTransfer: false,
    reason: 'Contains PII - no cross-border transfer',
  },

  // Financial data - restricted
  FINANCIAL: {
    allowTranslation: true,
    allowCrossBorderTransfer: false,
    reason: 'Financial data - no cross-border transfer',
  },

  // Medical data - HIPAA restrictions
  MEDICAL: {
    allowTranslation: true,
    allowCrossBorderTransfer: false,
    reason: 'Medical data - HIPAA restrictions apply',
  },
};

/**
 * Region-based translation restrictions
 * Some regions may have restrictions on data transfer
 */
export const REGION_RESTRICTIONS: Record<string, LanguageCode[]> = {
  // Example: EU GDPR restrictions
  EU: [],

  // Example: China data localization
  CN: ['zh'],

  // Example: Russia data localization
  RU: ['ru'],
};

/**
 * Get translation policy for given classification tags
 */
export function getPolicyForClassification(
  classificationTags: string[]
): TranslationPolicy {
  // If no classification tags, use default
  if (!classificationTags || classificationTags.length === 0) {
    return DEFAULT_POLICY;
  }

  // Check for most restrictive policy
  let mostRestrictive: TranslationPolicy = DEFAULT_POLICY;

  for (const tag of classificationTags) {
    const policy = CLASSIFICATION_POLICIES[tag.toUpperCase()];
    if (policy) {
      // No translation allowed is most restrictive
      if (!policy.allowTranslation) {
        return policy;
      }

      // No cross-border transfer is more restrictive than allowed
      if (
        !policy.allowCrossBorderTransfer &&
        mostRestrictive.allowCrossBorderTransfer
      ) {
        mostRestrictive = policy;
      }

      // Forbidden languages
      if (
        policy.forbiddenTargetLanguages &&
        policy.forbiddenTargetLanguages.length > 0
      ) {
        mostRestrictive = {
          ...mostRestrictive,
          forbiddenTargetLanguages: [
            ...(mostRestrictive.forbiddenTargetLanguages || []),
            ...policy.forbiddenTargetLanguages,
          ],
        };
      }

      // Allowed languages (intersection if multiple policies)
      if (
        policy.allowedTargetLanguages &&
        policy.allowedTargetLanguages.length > 0
      ) {
        if (mostRestrictive.allowedTargetLanguages) {
          // Intersection
          mostRestrictive = {
            ...mostRestrictive,
            allowedTargetLanguages:
              mostRestrictive.allowedTargetLanguages.filter((lang) =>
                policy.allowedTargetLanguages!.includes(lang)
              ),
          };
        } else {
          mostRestrictive = {
            ...mostRestrictive,
            allowedTargetLanguages: policy.allowedTargetLanguages,
          };
        }
      }
    }
  }

  return mostRestrictive;
}

/**
 * Check if translation is allowed based on policy
 */
export function isTranslationAllowed(
  policy: TranslationPolicy,
  targetLanguage: LanguageCode
): { allowed: boolean; reason?: string } {
  // Check if translation is allowed at all
  if (!policy.allowTranslation) {
    return {
      allowed: false,
      reason: policy.reason || 'Translation not allowed by policy',
    };
  }

  // Check forbidden languages
  if (
    policy.forbiddenTargetLanguages &&
    policy.forbiddenTargetLanguages.includes(targetLanguage)
  ) {
    return {
      allowed: false,
      reason: `Translation to ${targetLanguage} is forbidden by policy`,
    };
  }

  // Check allowed languages
  if (
    policy.allowedTargetLanguages &&
    policy.allowedTargetLanguages.length > 0 &&
    !policy.allowedTargetLanguages.includes(targetLanguage)
  ) {
    return {
      allowed: false,
      reason: `Translation to ${targetLanguage} is not in allowed languages`,
    };
  }

  return { allowed: true };
}

/**
 * Merge multiple policies (most restrictive wins)
 */
export function mergePolicies(
  policies: TranslationPolicy[]
): TranslationPolicy {
  if (policies.length === 0) return DEFAULT_POLICY;
  if (policies.length === 1) return policies[0];

  let merged = policies[0];

  for (let i = 1; i < policies.length; i++) {
    const policy = policies[i];

    // If any policy disallows translation, translation is not allowed
    if (!policy.allowTranslation) {
      merged.allowTranslation = false;
      merged.reason = policy.reason;
    }

    // If any policy disallows cross-border transfer
    if (!policy.allowCrossBorderTransfer) {
      merged.allowCrossBorderTransfer = false;
    }

    // Merge forbidden languages (union)
    if (policy.forbiddenTargetLanguages) {
      merged.forbiddenTargetLanguages = [
        ...(merged.forbiddenTargetLanguages || []),
        ...policy.forbiddenTargetLanguages,
      ];
    }

    // Merge allowed languages (intersection)
    if (policy.allowedTargetLanguages) {
      if (merged.allowedTargetLanguages) {
        merged.allowedTargetLanguages = merged.allowedTargetLanguages.filter(
          (lang) => policy.allowedTargetLanguages!.includes(lang)
        );
      } else {
        merged.allowedTargetLanguages = policy.allowedTargetLanguages;
      }
    }

    // Merge classification tags
    merged.classificationTags = [
      ...(merged.classificationTags || []),
      ...(policy.classificationTags || []),
    ];
  }

  return merged;
}
