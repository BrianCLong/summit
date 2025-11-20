import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const darkPatterns: string[] = require('./dark-patterns.json');

import {
  ConsentDialog,
  ConsentRecord,
  ExperimentDefinition,
  LocaleCopy,
  LocaleTemplate,
  PolicyTemplatePack,
  PurposeDefinition,
  PurposeScope,
  RenderOptions
} from './types.js';
import { DarkPatternLinter } from './validators.js';
import { ExperimentEngine } from './variants.js';

export class TemplatePack {
  private readonly linter: DarkPatternLinter;
  private readonly experiments: Map<string, ExperimentDefinition> = new Map();
  private readonly experimentEngine: ExperimentEngine;

  constructor(private readonly pack: PolicyTemplatePack) {
    this.linter = new DarkPatternLinter(darkPatterns);
    this.experimentEngine = new ExperimentEngine();
    this.assertIntegrity();
  }

  private assertIntegrity(): void {
    if (!this.pack.policyId) {
      throw new Error('policyId is required');
    }
    if (!this.pack.version) {
      throw new Error('version is required');
    }
    if (!this.pack.defaultLocale) {
      throw new Error('defaultLocale is required');
    }
    if (!this.pack.locales[this.pack.defaultLocale]) {
      throw new Error(`defaultLocale ${this.pack.defaultLocale} is not defined`);
    }

    const lintResults = this.linter.lintPack(this.pack);
    if (lintResults.length > 0) {
      const message = lintResults.map((result) => `${result.locale}: ${result.message}`).join('\n');
      throw new Error(`Dark pattern linter failed:\n${message}`);
    }
  }

  public registerExperiment(definition: ExperimentDefinition): void {
    this.validateExperiment(definition);
    this.experiments.set(definition.name, definition);
    this.experimentEngine.register(definition);
  }

  private validateExperiment(definition: ExperimentDefinition): void {
    const locales = Object.keys(this.pack.locales);
    locales.forEach((locale) => {
      const base = this.pack.locales[locale];
      const controlCopy = this.applyOverrides(base, definition.controlVariant.uiOverrides, definition.controlVariant.id);
      definition.variants.forEach((variant) => {
        const variantCopy = this.applyOverrides(base, variant.uiOverrides, variant.id);
        this.assertSemanticParity(controlCopy, variantCopy, locale, variant.id);
      });
    });
  }

  private assertSemanticParity(control: LocaleCopy, variant: LocaleCopy, locale: string, variantId: string): void {
    const canonicalControl = this.semanticSignature(control);
    const canonicalVariant = this.semanticSignature(variant);
    if (canonicalControl !== canonicalVariant) {
      throw new Error(
        `Variant ${variantId} for locale ${locale} changes consent semantics. Expected signature ${canonicalControl} but received ${canonicalVariant}.`
      );
    }
  }

  private semanticSignature(copy: LocaleCopy): string {
    return [copy.summary, ...copy.bulletPoints, copy.footer].join('|').toLowerCase();
  }

  private applyOverrides(
    base: LocaleTemplate,
    overrides: Partial<LocaleCopy> | undefined,
    variantId: string
  ): LocaleCopy {
    const variantOverrides = base.variantOverrides?.[variantId] ?? {};
    const merged: LocaleCopy = {
      title: base.title,
      summary: base.summary,
      bulletPoints: [...base.bulletPoints],
      acceptCta: base.acceptCta,
      rejectCta: base.rejectCta,
      manageCta: base.manageCta,
      footer: base.footer
    };

    const layers = [variantOverrides, overrides].filter(Boolean);
    layers.forEach((layer) => {
      if (!layer) return;
      if (layer.bulletPoints) {
        merged.bulletPoints = [...layer.bulletPoints];
      }
      merged.title = layer.title ?? merged.title;
      merged.summary = layer.summary ?? merged.summary;
      merged.acceptCta = layer.acceptCta ?? merged.acceptCta;
      merged.rejectCta = layer.rejectCta ?? merged.rejectCta;
      merged.manageCta = layer.manageCta ?? merged.manageCta;
      merged.footer = layer.footer ?? merged.footer;
    });

    return merged;
  }

  private getLocale(locale: string): LocaleTemplate {
    return this.pack.locales[locale] ?? this.pack.locales[this.pack.defaultLocale];
  }

  private scopePurposes(requested: string[] | undefined): PurposeDefinition[] {
    if (!requested || requested.length === 0) {
      return this.pack.purposes;
    }
    const requestedSet = new Set(requested);
    return this.pack.purposes.filter((purpose) => requestedSet.has(purpose.id));
  }

  private normalizeScopes(purposes: PurposeDefinition[], scopedPurposes?: string[]): PurposeScope[] {
    const scopeSet = new Set(scopedPurposes ?? purposes.map((p) => p.id));
    return purposes.map((purpose) => ({ id: purpose.id, enabled: scopeSet.has(purpose.id) }));
  }

  public render(options: RenderOptions): ConsentDialog {
    const localeTemplate = this.getLocale(options.locale);
    const purposes = this.scopePurposes(options.scopedPurposes);
    const selection = this.experimentEngine.select(options.experiment);
    const variantId = selection?.id ?? 'control';
    const overrides = selection?.uiOverrides;
    const copy = this.applyOverrides(localeTemplate, overrides, variantId);

    return {
      locale: localeTemplate.locale,
      copy,
      purposes,
      policyId: this.pack.policyId,
      policyVersion: this.pack.version,
      variant: variantId
    };
  }

  public createConsentRecord(
    userId: string,
    decision: 'accept' | 'reject' | 'custom',
    options: RenderOptions
  ): ConsentRecordWithScopes {
    const dialog = this.render(options);
    const scopes = this.normalizeScopes(dialog.purposes, options.scopedPurposes);
    const record: ConsentRecord = {
      policyId: dialog.policyId,
      policyVersion: dialog.policyVersion,
      userId,
      locale: dialog.locale,
      decision,
      purposes: scopes,
      timestamp: new Date().toISOString(),
      variant: dialog.variant
    };
    return {
      dialog,
      record
    };
  }

  public getExperiment(name: string): ExperimentDefinition | undefined {
    return this.experiments.get(name);
  }
}

export interface ConsentRecordWithScopes {
  dialog: ConsentDialog;
  record: ConsentRecord;
}
