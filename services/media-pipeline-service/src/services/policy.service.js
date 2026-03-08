"use strict";
/**
 * Policy Service
 *
 * Handles retention policies, RTBF (Right to Be Forgotten), and redaction.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.policyService = exports.PolicyService = void 0;
const logger_js_1 = require("../utils/logger.js");
const hash_js_1 = require("../utils/hash.js");
const time_js_1 = require("../utils/time.js");
const index_js_1 = __importDefault(require("../config/index.js"));
// Default redaction rules
const DEFAULT_REDACTION_RULES = [
    {
        id: 'phone-us',
        name: 'US Phone Numbers',
        pattern: '\\b\\d{3}[-.]?\\d{3}[-.]?\\d{4}\\b',
        replacement: '[PHONE REDACTED]',
        fieldTypes: ['phone'],
        enabled: true,
        priority: 100,
    },
    {
        id: 'phone-intl',
        name: 'International Phone Numbers',
        pattern: '\\+\\d{1,3}[-.]?\\d{1,4}[-.]?\\d{1,4}[-.]?\\d{1,9}',
        replacement: '[PHONE REDACTED]',
        fieldTypes: ['phone'],
        enabled: true,
        priority: 99,
    },
    {
        id: 'email',
        name: 'Email Addresses',
        pattern: '[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}',
        replacement: '[EMAIL REDACTED]',
        fieldTypes: ['email'],
        enabled: true,
        priority: 90,
    },
    {
        id: 'ssn',
        name: 'Social Security Numbers',
        pattern: '\\b\\d{3}[-]?\\d{2}[-]?\\d{4}\\b',
        replacement: '[SSN REDACTED]',
        fieldTypes: ['ssn'],
        enabled: true,
        priority: 100,
    },
    {
        id: 'credit-card',
        name: 'Credit Card Numbers',
        pattern: '\\b(?:\\d{4}[-\\s]?){3}\\d{4}\\b',
        replacement: '[CARD REDACTED]',
        fieldTypes: ['credit_card'],
        enabled: true,
        priority: 100,
    },
    {
        id: 'ip-address',
        name: 'IP Addresses',
        pattern: '\\b(?:\\d{1,3}\\.){3}\\d{1,3}\\b',
        replacement: '[IP REDACTED]',
        fieldTypes: ['ip'],
        enabled: true,
        priority: 50,
    },
];
class PolicyService {
    log = (0, logger_js_1.createChildLogger)({ service: 'PolicyService' });
    redactionRules = [...DEFAULT_REDACTION_RULES];
    customRules = new Map();
    /**
     * Add a custom redaction rule
     */
    addRedactionRule(rule) {
        this.customRules.set(rule.id, rule);
        this.log.info({ ruleId: rule.id, ruleName: rule.name }, 'Added custom redaction rule');
    }
    /**
     * Remove a custom redaction rule
     */
    removeRedactionRule(ruleId) {
        const removed = this.customRules.delete(ruleId);
        if (removed) {
            this.log.info({ ruleId }, 'Removed custom redaction rule');
        }
        return removed;
    }
    /**
     * Get all active redaction rules
     */
    getActiveRules() {
        const allRules = [...this.redactionRules, ...this.customRules.values()];
        return allRules.filter((r) => r.enabled).sort((a, b) => b.priority - a.priority);
    }
    // ============================================================================
    // Retention Policy
    // ============================================================================
    /**
     * Apply retention policy to a media asset
     */
    applyRetentionPolicy(mediaAsset, policyId) {
        const policy = mediaAsset.policy;
        // Check if already expired
        if (mediaAsset.expiresAt && (0, time_js_1.isExpired)(mediaAsset.expiresAt)) {
            return {
                action: 'delete',
                reason: 'Asset has expired according to retention policy',
            };
        }
        // Determine retention based on policy labels
        let retentionDays = index_js_1.default.defaultRetentionDays;
        let action = 'retain';
        if (policy?.retentionPolicy) {
            switch (policy.retentionPolicy) {
                case 'short-term':
                    retentionDays = 30;
                    break;
                case 'medium-term':
                    retentionDays = 180;
                    break;
                case 'long-term':
                    retentionDays = 365 * 3;
                    break;
                case 'permanent':
                    retentionDays = 365 * 100; // Effectively permanent
                    break;
                case 'legal-hold':
                    action = 'retain';
                    retentionDays = 365 * 10;
                    break;
            }
        }
        // Adjust based on sensitivity
        if (policy?.sensitivity) {
            switch (policy.sensitivity) {
                case 'top_secret':
                case 'secret':
                    // Sensitive data may have shorter retention
                    retentionDays = Math.min(retentionDays, 365);
                    break;
            }
        }
        const expiresAt = (0, time_js_1.getExpirationDate)(retentionDays);
        this.log.info({
            mediaAssetId: mediaAsset.id,
            action,
            retentionDays,
            expiresAt,
        }, 'Applied retention policy');
        return {
            action,
            expiresAt,
            reason: `Retention policy applied: ${retentionDays} days`,
        };
    }
    /**
     * Create a retention event
     */
    createRetentionEvent(mediaAssetId, action, reason, expiresAt, policyId) {
        return {
            id: (0, hash_js_1.generateId)(),
            mediaAssetId,
            action,
            timestamp: (0, time_js_1.now)(),
            expiresAt,
            reason,
            policyId,
            authorizedBy: index_js_1.default.authorityId,
        };
    }
    /**
     * Check assets for expiration and return those that should be deleted
     */
    checkExpiredAssets(assets) {
        return assets.filter((asset) => asset.expiresAt && (0, time_js_1.isExpired)(asset.expiresAt));
    }
    // ============================================================================
    // RTBF (Right to Be Forgotten)
    // ============================================================================
    /**
     * Process an RTBF request
     */
    async processRTBFRequest(request, assets, transcripts) {
        this.log.info({
            requestId: request.id,
            scope: request.scope,
            subjectCount: request.subjectIdentifiers.length,
        }, 'Processing RTBF request');
        const affectedAssets = [];
        const errors = [];
        // Filter assets based on request scope
        const targetAssets = request.mediaAssetIds
            ? assets.filter((a) => request.mediaAssetIds.includes(a.id))
            : assets;
        for (const asset of targetAssets) {
            try {
                // Check if asset contains subject data
                const containsSubject = this.assetContainsSubject(asset, request.subjectIdentifiers, transcripts.get(asset.transcriptId || ''));
                if (!containsSubject) {
                    continue;
                }
                // Determine action based on scope
                let action;
                let reason;
                switch (request.scope) {
                    case 'full':
                        action = 'deleted';
                        reason = 'Full deletion requested';
                        break;
                    case 'partial':
                        action = 'redacted';
                        reason = 'Partial redaction applied';
                        break;
                    case 'anonymize':
                        action = 'anonymized';
                        reason = 'Data anonymized';
                        break;
                    default:
                        action = 'retained';
                        reason = 'No action taken';
                }
                // Check for legal holds or other restrictions
                if (asset.policy?.retentionPolicy === 'legal-hold') {
                    action = 'retained';
                    reason = 'Asset under legal hold - cannot be modified';
                }
                affectedAssets.push({
                    mediaAssetId: asset.id,
                    action,
                    reason,
                });
            }
            catch (error) {
                const message = error instanceof Error ? error.message : 'Unknown error';
                errors.push(`Failed to process asset ${asset.id}: ${message}`);
            }
        }
        this.log.info({
            requestId: request.id,
            affectedCount: affectedAssets.length,
            errorCount: errors.length,
        }, 'RTBF request processed');
        return {
            id: (0, hash_js_1.generateId)(),
            requestId: request.id,
            status: errors.length === 0 ? 'completed' : affectedAssets.length > 0 ? 'partial' : 'failed',
            processedAt: (0, time_js_1.now)(),
            affectedAssets,
            errors: errors.length > 0 ? errors : undefined,
        };
    }
    /**
     * Check if an asset contains data about a subject
     */
    assetContainsSubject(asset, subjectIdentifiers, transcript) {
        const lowerIdentifiers = subjectIdentifiers.map((id) => id.toLowerCase());
        // Check participants
        const participants = transcript?.participants || asset.participants || [];
        for (const participant of participants) {
            if (participant.identifier &&
                lowerIdentifiers.includes(participant.identifier.toLowerCase())) {
                return true;
            }
            if (participant.displayName &&
                lowerIdentifiers.includes(participant.displayName.toLowerCase())) {
                return true;
            }
        }
        // Check transcript content
        if (transcript?.rawContent) {
            const lowerContent = transcript.rawContent.toLowerCase();
            for (const identifier of lowerIdentifiers) {
                if (lowerContent.includes(identifier)) {
                    return true;
                }
            }
        }
        return false;
    }
    // ============================================================================
    // Redaction
    // ============================================================================
    /**
     * Apply redaction rules to text
     */
    redactText(text, ruleIds) {
        let redactedText = text;
        const rulesApplied = [];
        const fieldTypes = new Set();
        let redactionsApplied = 0;
        const rules = this.getActiveRules();
        const filteredRules = ruleIds
            ? rules.filter((r) => ruleIds.includes(r.id))
            : rules;
        for (const rule of filteredRules) {
            try {
                const regex = new RegExp(rule.pattern, 'gi');
                const matches = redactedText.match(regex);
                if (matches && matches.length > 0) {
                    redactedText = redactedText.replace(regex, rule.replacement);
                    redactionsApplied += matches.length;
                    rulesApplied.push(rule.id);
                    rule.fieldTypes?.forEach((ft) => fieldTypes.add(ft));
                }
            }
            catch (error) {
                this.log.error({ ruleId: rule.id, pattern: rule.pattern, error }, 'Failed to apply redaction rule');
            }
        }
        return {
            originalText: text,
            redactedText,
            redactionsApplied,
            rulesApplied,
            fieldTypes: Array.from(fieldTypes),
        };
    }
    /**
     * Redact a transcript
     */
    redactTranscript(transcript, ruleIds) {
        const originalChecksum = (0, hash_js_1.hashString)(JSON.stringify(transcript.utterances));
        const redactedUtterances = [];
        let totalRedactions = 0;
        const allRulesApplied = new Set();
        const allFieldTypes = new Set();
        // Redact each utterance
        for (const utterance of transcript.utterances) {
            const result = this.redactText(utterance.content, ruleIds);
            totalRedactions += result.redactionsApplied;
            result.rulesApplied.forEach((r) => allRulesApplied.add(r));
            result.fieldTypes.forEach((ft) => allFieldTypes.add(ft));
            redactedUtterances.push({
                ...utterance,
                content: result.redactedText,
                contentRedacted: result.redactedText,
            });
        }
        // Redact raw content
        let rawContentRedacted;
        if (transcript.rawContent) {
            const rawResult = this.redactText(transcript.rawContent, ruleIds);
            rawContentRedacted = rawResult.redactedText;
            totalRedactions += rawResult.redactionsApplied;
            rawResult.rulesApplied.forEach((r) => allRulesApplied.add(r));
            rawResult.fieldTypes.forEach((ft) => allFieldTypes.add(ft));
        }
        const redactedChecksum = (0, hash_js_1.hashString)(JSON.stringify(redactedUtterances));
        const redactedTranscript = {
            ...transcript,
            utterances: redactedUtterances,
            rawContentRedacted,
        };
        const event = {
            id: (0, hash_js_1.generateId)(),
            mediaAssetId: transcript.mediaAssetId,
            transcriptId: transcript.id,
            timestamp: (0, time_js_1.now)(),
            rulesApplied: Array.from(allRulesApplied),
            redactionsCount: totalRedactions,
            fieldTypes: Array.from(allFieldTypes),
            originalChecksum,
            redactedChecksum,
            authorizedBy: index_js_1.default.authorityId,
        };
        this.log.info({
            transcriptId: transcript.id,
            redactionsCount: totalRedactions,
            rulesApplied: event.rulesApplied,
        }, 'Transcript redacted');
        return { redactedTranscript, event };
    }
    /**
     * Check if auto-redaction is enabled
     */
    isAutoRedactionEnabled() {
        return index_js_1.default.enableAutoRedaction;
    }
    /**
     * Check if policy enforcement is in dry-run mode
     */
    isDryRunMode() {
        return index_js_1.default.policyDryRun;
    }
}
exports.PolicyService = PolicyService;
exports.policyService = new PolicyService();
exports.default = exports.policyService;
