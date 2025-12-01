export type ConsentDecision = 'accept' | 'reject' | 'custom';

export interface PurposeDefinition {
  id: string;
  category: string;
  legalBasis: 'consent' | 'legitimate-interest';
  defaultEnabled: boolean;
  description: Record<string, string>;
}

export interface PurposeScope {
  id: string;
  enabled: boolean;
}

export interface LocaleCopy {
  title: string;
  summary: string;
  bulletPoints: string[];
  acceptCta: string;
  rejectCta: string;
  manageCta: string;
  footer: string;
}

export interface LocaleTemplate extends LocaleCopy {
  locale: string;
  variantOverrides?: Record<string, Partial<LocaleCopy>>;
}

export interface PolicyTemplatePack {
  policyId: string;
  version: string;
  defaultLocale: string;
  purposes: PurposeDefinition[];
  locales: Record<string, LocaleTemplate>;
}

export interface ConsentDialog {
  locale: string;
  copy: LocaleCopy;
  purposes: PurposeDefinition[];
  policyId: string;
  policyVersion: string;
  variant: string;
}

export interface ConsentRecord {
  policyId: string;
  policyVersion: string;
  userId: string;
  locale: string;
  decision: ConsentDecision;
  purposes: PurposeScope[];
  timestamp: string;
  variant: string;
}

export interface ConsentArtifact {
  algorithm: string;
  signature: string;
  payload: ConsentRecord;
}

export interface ExperimentVariant {
  id: string;
  probability: number;
  uiOverrides?: Partial<LocaleCopy>;
}

export interface ExperimentDefinition {
  name: string;
  controlVariant: ExperimentVariant;
  variants: ExperimentVariant[];
}

export interface RenderOptions {
  locale: string;
  experiment?: string;
  scopedPurposes?: string[];
}
