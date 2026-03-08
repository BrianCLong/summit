"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SandboxValidator = exports.ValidationSeverity = void 0;
exports.getSandboxValidator = getSandboxValidator;
const index_js_1 = require("../types/index.js");
const logger_js_1 = require("../utils/logger.js");
const logger = (0, logger_js_1.createLogger)('SandboxValidator');
/**
 * Validation severity levels
 */
var ValidationSeverity;
(function (ValidationSeverity) {
    ValidationSeverity["ERROR"] = "error";
    ValidationSeverity["WARNING"] = "warning";
    ValidationSeverity["INFO"] = "info";
})(ValidationSeverity || (exports.ValidationSeverity = ValidationSeverity = {}));
/**
 * SandboxValidator performs comprehensive validation of sandbox profiles
 * to ensure they meet security and compliance requirements.
 */
class SandboxValidator {
    rules = [];
    constructor() {
        this.initializeRules();
    }
    /**
     * Validate a complete sandbox profile
     */
    validate(profile) {
        const findings = [];
        for (const rule of this.rules) {
            const finding = rule.check(profile);
            if (finding) {
                findings.push(finding);
            }
        }
        const valid = !findings.some(f => f.severity === ValidationSeverity.ERROR);
        logger.info('Validation complete', {
            profileId: profile.id,
            valid,
            errorCount: findings.filter(f => f.severity === ValidationSeverity.ERROR).length,
            warningCount: findings.filter(f => f.severity === ValidationSeverity.WARNING).length,
        });
        return {
            valid,
            findings,
            timestamp: new Date(),
            profileId: profile.id,
        };
    }
    /**
     * Quick check if profile has critical issues
     */
    hasErrors(profile) {
        for (const rule of this.rules) {
            const finding = rule.check(profile);
            if (finding && finding.severity === ValidationSeverity.ERROR) {
                return true;
            }
        }
        return false;
    }
    /**
     * Add a custom validation rule
     */
    addRule(rule) {
        this.rules.push(rule);
    }
    initializeRules() {
        // Security rules
        this.rules.push({
            code: 'SEC001',
            check: this.checkLinkbackDisabled.bind(this),
        });
        this.rules.push({
            code: 'SEC002',
            check: this.checkFederationDisabled.bind(this),
        });
        this.rules.push({
            code: 'SEC003',
            check: this.checkAirgapNetworkRestriction.bind(this),
        });
        this.rules.push({
            code: 'SEC004',
            check: this.checkExternalServicesAirgap.bind(this),
        });
        this.rules.push({
            code: 'SEC005',
            check: this.checkAuditEnabled.bind(this),
        });
        // Data rules
        this.rules.push({
            code: 'DATA001',
            check: this.checkDataRetention.bind(this),
        });
        this.rules.push({
            code: 'DATA002',
            check: this.checkPIIHandling.bind(this),
        });
        this.rules.push({
            code: 'DATA003',
            check: this.checkRecordLimits.bind(this),
        });
        // Resource rules
        this.rules.push({
            code: 'RES001',
            check: this.checkResourceQuotas.bind(this),
        });
        this.rules.push({
            code: 'RES002',
            check: this.checkExportLimits.bind(this),
        });
        // Configuration rules
        this.rules.push({
            code: 'CFG001',
            check: this.checkUIIndicators.bind(this),
        });
        this.rules.push({
            code: 'CFG002',
            check: this.checkExpiration.bind(this),
        });
    }
    // Security validation rules
    checkLinkbackDisabled(profile) {
        if (profile.dataAccessPolicy.allowLinkbackToProduction) {
            return {
                severity: ValidationSeverity.ERROR,
                code: 'SEC001',
                message: 'Linkback to production must be disabled',
                field: 'dataAccessPolicy.allowLinkbackToProduction',
                suggestion: 'Set allowLinkbackToProduction to false',
            };
        }
        return null;
    }
    checkFederationDisabled(profile) {
        if (profile.integrationRestrictions.allowFederation) {
            return {
                severity: ValidationSeverity.ERROR,
                code: 'SEC002',
                message: 'Federation must be disabled in sandbox',
                field: 'integrationRestrictions.allowFederation',
                suggestion: 'Set allowFederation to false',
            };
        }
        const federationConnector = profile.connectorRestrictions.find(c => c.connectorType === index_js_1.ConnectorType.FEDERATION && c.allowed);
        if (federationConnector) {
            return {
                severity: ValidationSeverity.ERROR,
                code: 'SEC002',
                message: 'Federation connector must be disabled',
                field: 'connectorRestrictions',
                suggestion: 'Set federation connector allowed to false',
            };
        }
        return null;
    }
    checkAirgapNetworkRestriction(profile) {
        if (profile.isolationLevel === index_js_1.SandboxIsolationLevel.AIRGAPPED) {
            if (profile.resourceQuotas.maxNetworkBytesPerHour > 0) {
                return {
                    severity: ValidationSeverity.ERROR,
                    code: 'SEC003',
                    message: 'Airgapped sandbox cannot have network access',
                    field: 'resourceQuotas.maxNetworkBytesPerHour',
                    suggestion: 'Set maxNetworkBytesPerHour to 0',
                };
            }
        }
        return null;
    }
    checkExternalServicesAirgap(profile) {
        if (profile.isolationLevel === index_js_1.SandboxIsolationLevel.AIRGAPPED) {
            const externalAllowed = profile.connectorRestrictions.find(c => c.connectorType === index_js_1.ConnectorType.EXTERNAL_SERVICE && c.allowed);
            if (externalAllowed) {
                return {
                    severity: ValidationSeverity.ERROR,
                    code: 'SEC004',
                    message: 'Airgapped sandbox cannot access external services',
                    field: 'connectorRestrictions',
                    suggestion: 'Disable external service connector',
                };
            }
        }
        return null;
    }
    checkAuditEnabled(profile) {
        if (!profile.auditConfig.logAllQueries &&
            !profile.auditConfig.logAllMutations) {
            return {
                severity: ValidationSeverity.WARNING,
                code: 'SEC005',
                message: 'Audit logging should be enabled for queries and mutations',
                field: 'auditConfig',
                suggestion: 'Enable logAllQueries and logAllMutations',
            };
        }
        return null;
    }
    // Data validation rules
    checkDataRetention(profile) {
        if (profile.dataAccessPolicy.retentionDays > 90) {
            return {
                severity: ValidationSeverity.WARNING,
                code: 'DATA001',
                message: 'Long data retention may increase risk',
                field: 'dataAccessPolicy.retentionDays',
                suggestion: 'Consider reducing retention to 30-90 days',
            };
        }
        return null;
    }
    checkPIIHandling(profile) {
        if (profile.dataAccessPolicy.mode !== index_js_1.DataAccessMode.SYNTHETIC_ONLY &&
            profile.dataAccessPolicy.piiHandling !== 'block' &&
            profile.dataAccessPolicy.piiHandling !== 'redact') {
            return {
                severity: ValidationSeverity.WARNING,
                code: 'DATA002',
                message: 'Non-synthetic data mode should use strict PII handling',
                field: 'dataAccessPolicy.piiHandling',
                suggestion: 'Use block or redact for PII handling',
            };
        }
        return null;
    }
    checkRecordLimits(profile) {
        if (profile.dataAccessPolicy.maxRecords > 100000) {
            return {
                severity: ValidationSeverity.INFO,
                code: 'DATA003',
                message: 'Large record limit may impact performance',
                field: 'dataAccessPolicy.maxRecords',
                suggestion: 'Consider pagination for large datasets',
            };
        }
        return null;
    }
    // Resource validation rules
    checkResourceQuotas(profile) {
        if (profile.resourceQuotas.maxCpuMs > 120000) {
            return {
                severity: ValidationSeverity.WARNING,
                code: 'RES001',
                message: 'High CPU quota may indicate need for optimization',
                field: 'resourceQuotas.maxCpuMs',
                suggestion: 'Review execution efficiency',
            };
        }
        return null;
    }
    checkExportLimits(profile) {
        if (profile.resourceQuotas.maxDataExportMb > 0 &&
            !profile.dataAccessPolicy.requireAnonymizationAudit) {
            return {
                severity: ValidationSeverity.WARNING,
                code: 'RES002',
                message: 'Exports enabled without anonymization audit',
                field: 'dataAccessPolicy.requireAnonymizationAudit',
                suggestion: 'Enable requireAnonymizationAudit when exports are allowed',
            };
        }
        return null;
    }
    // Configuration validation rules
    checkUIIndicators(profile) {
        if (profile.uiIndicators.mode === 'badge') {
            return {
                severity: ValidationSeverity.INFO,
                code: 'CFG001',
                message: 'Badge-only indicator may not be visible enough',
                field: 'uiIndicators.mode',
                suggestion: 'Consider using banner or full mode for clearer indication',
            };
        }
        return null;
    }
    checkExpiration(profile) {
        if (!profile.expiresAt) {
            return {
                severity: ValidationSeverity.WARNING,
                code: 'CFG002',
                message: 'Sandbox has no expiration date',
                field: 'expiresAt',
                suggestion: 'Set an expiration date to ensure cleanup',
            };
        }
        const now = new Date();
        const sixMonths = new Date(now);
        sixMonths.setMonth(sixMonths.getMonth() + 6);
        if (profile.expiresAt > sixMonths) {
            return {
                severity: ValidationSeverity.INFO,
                code: 'CFG002',
                message: 'Long-lived sandbox - ensure periodic review',
                field: 'expiresAt',
                suggestion: 'Consider shorter expiration with renewal option',
            };
        }
        return null;
    }
}
exports.SandboxValidator = SandboxValidator;
/**
 * Singleton instance
 */
let validatorInstance = null;
function getSandboxValidator() {
    if (!validatorInstance) {
        validatorInstance = new SandboxValidator();
    }
    return validatorInstance;
}
