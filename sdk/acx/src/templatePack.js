"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TemplatePack = void 0;
const node_module_1 = require("node:module");
const require = (0, node_module_1.createRequire)(import.meta.url);
const darkPatterns = require('./dark-patterns.json');
const validators_js_1 = require("./validators.js");
const variants_js_1 = require("./variants.js");
class TemplatePack {
    pack;
    linter;
    experiments = new Map();
    experimentEngine;
    constructor(pack) {
        this.pack = pack;
        this.linter = new validators_js_1.DarkPatternLinter(darkPatterns);
        this.experimentEngine = new variants_js_1.ExperimentEngine();
        this.assertIntegrity();
    }
    assertIntegrity() {
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
    registerExperiment(definition) {
        this.validateExperiment(definition);
        this.experiments.set(definition.name, definition);
        this.experimentEngine.register(definition);
    }
    validateExperiment(definition) {
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
    assertSemanticParity(control, variant, locale, variantId) {
        const canonicalControl = this.semanticSignature(control);
        const canonicalVariant = this.semanticSignature(variant);
        if (canonicalControl !== canonicalVariant) {
            throw new Error(`Variant ${variantId} for locale ${locale} changes consent semantics. Expected signature ${canonicalControl} but received ${canonicalVariant}.`);
        }
    }
    semanticSignature(copy) {
        return [copy.summary, ...copy.bulletPoints, copy.footer].join('|').toLowerCase();
    }
    applyOverrides(base, overrides, variantId) {
        const variantOverrides = base.variantOverrides?.[variantId] ?? {};
        const merged = {
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
            if (!layer)
                return;
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
    getLocale(locale) {
        return this.pack.locales[locale] ?? this.pack.locales[this.pack.defaultLocale];
    }
    scopePurposes(requested) {
        if (!requested || requested.length === 0) {
            return this.pack.purposes;
        }
        const requestedSet = new Set(requested);
        return this.pack.purposes.filter((purpose) => requestedSet.has(purpose.id));
    }
    normalizeScopes(purposes, scopedPurposes) {
        const scopeSet = new Set(scopedPurposes ?? purposes.map((p) => p.id));
        return purposes.map((purpose) => ({ id: purpose.id, enabled: scopeSet.has(purpose.id) }));
    }
    render(options) {
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
    createConsentRecord(userId, decision, options) {
        const dialog = this.render(options);
        const scopes = this.normalizeScopes(dialog.purposes, options.scopedPurposes);
        const record = {
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
    getExperiment(name) {
        return this.experiments.get(name);
    }
}
exports.TemplatePack = TemplatePack;
