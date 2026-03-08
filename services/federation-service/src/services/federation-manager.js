"use strict";
/**
 * Federation Manager
 *
 * Core service implementing push, pull, and subscription sharing models.
 * Orchestrates policy evaluation, redaction, and provenance tracking.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FederationManager = void 0;
const uuid_1 = require("uuid");
const pino_1 = __importDefault(require("pino"));
const types_js_1 = require("../models/types.js");
const logger = (0, pino_1.default)({ name: 'federation-manager' });
/**
 * Federation Manager Service
 */
class FederationManager {
    policyEvaluator;
    redactionEngine;
    provenanceTracker;
    constructor(policyEvaluator, redactionEngine, provenanceTracker) {
        this.policyEvaluator = policyEvaluator;
        this.redactionEngine = redactionEngine;
        this.provenanceTracker = provenanceTracker;
    }
    /**
     * PUSH MODEL: Share objects to a partner
     */
    async pushShare(request, agreement) {
        logger.info({
            agreementId: request.agreementId,
            objectCount: request.objects.length,
        }, 'Processing push share request');
        // Validate sharing mode
        if (agreement.sharingMode !== types_js_1.SharingMode.PUSH) {
            throw new Error(`Agreement ${agreement.id} does not support PUSH sharing`);
        }
        // Process each object
        const sharedObjects = [];
        for (const obj of request.objects) {
            try {
                const sharedObj = await this.processObjectForSharing(obj, agreement, request.sharedBy);
                sharedObjects.push(sharedObj);
            }
            catch (error) {
                logger.error({
                    objectId: obj.id,
                    error: error instanceof Error ? error.message : String(error),
                }, 'Failed to process object for sharing');
                // Continue with other objects
            }
        }
        if (sharedObjects.length === 0) {
            throw new Error('No objects could be shared');
        }
        // Create share package
        const sharePackage = {
            id: (0, uuid_1.v4)(),
            agreementId: request.agreementId,
            channelId: request.channelId,
            objects: sharedObjects,
            sharedAt: new Date(),
            sharedBy: request.sharedBy,
            provenanceLinks: sharedObjects.flatMap((o) => this.provenanceTracker.getProvenanceChain(o.id).map((p) => p.id)),
        };
        logger.info({
            packageId: sharePackage.id,
            objectCount: sharedObjects.length,
        }, 'Share package created');
        return sharePackage;
    }
    /**
     * PULL MODEL: Query available objects from source
     */
    async pullQuery(query, agreement, availableObjects) {
        logger.info({
            agreementId: query.agreementId,
            availableCount: availableObjects.length,
        }, 'Processing pull query');
        // Validate sharing mode
        if (agreement.sharingMode !== types_js_1.SharingMode.PULL) {
            throw new Error(`Agreement ${agreement.id} does not support PULL sharing`);
        }
        // Filter by object types if specified
        let filtered = availableObjects;
        if (query.objectTypes && query.objectTypes.length > 0) {
            filtered = filtered.filter((obj) => query.objectTypes.includes(obj.type));
        }
        // Apply additional filters
        if (query.filter) {
            filtered = this.applyFilter(filtered, query.filter);
        }
        // Apply pagination
        const offset = query.offset || 0;
        const limit = query.limit || 100;
        const paginated = filtered.slice(offset, offset + limit);
        // Process for sharing
        const sharedObjects = [];
        for (const obj of paginated) {
            try {
                const sharedObj = await this.processObjectForSharing(obj, agreement, 'system');
                sharedObjects.push(sharedObj);
            }
            catch (error) {
                logger.error({
                    objectId: obj.id,
                    error: error instanceof Error ? error.message : String(error),
                }, 'Failed to process object for pull query');
            }
        }
        logger.info({
            resultCount: sharedObjects.length,
        }, 'Pull query complete');
        return sharedObjects;
    }
    /**
     * SUBSCRIPTION MODEL: Deliver objects matching subscription criteria
     */
    async deliverSubscription(subscription, agreement, objects) {
        logger.info({
            subscriptionId: subscription.id,
            agreementId: agreement.id,
            objectCount: objects.length,
        }, 'Processing subscription delivery');
        // Validate sharing mode
        if (agreement.sharingMode !== types_js_1.SharingMode.SUBSCRIPTION) {
            throw new Error(`Agreement ${agreement.id} does not support SUBSCRIPTION sharing`);
        }
        // Filter by subscription criteria
        let filtered = objects;
        if (subscription.objectTypes.length > 0) {
            filtered = filtered.filter((obj) => subscription.objectTypes.includes(obj.type));
        }
        if (subscription.filter) {
            filtered = this.applyFilter(filtered, subscription.filter);
        }
        // Process for sharing
        const sharedObjects = [];
        for (const obj of filtered) {
            try {
                const sharedObj = await this.processObjectForSharing(obj, agreement, 'subscription-service');
                sharedObjects.push(sharedObj);
            }
            catch (error) {
                logger.error({
                    objectId: obj.id,
                    error: error instanceof Error ? error.message : String(error),
                }, 'Failed to process object for subscription');
            }
        }
        // Create share package
        const sharePackage = {
            id: (0, uuid_1.v4)(),
            agreementId: agreement.id,
            channelId: subscription.channelId,
            objects: sharedObjects,
            sharedAt: new Date(),
            sharedBy: 'subscription-service',
            provenanceLinks: sharedObjects.flatMap((o) => this.provenanceTracker.getProvenanceChain(o.id).map((p) => p.id)),
        };
        logger.info({
            packageId: sharePackage.id,
            objectCount: sharedObjects.length,
        }, 'Subscription package created');
        return sharePackage;
    }
    /**
     * Process a single object for sharing
     */
    async processObjectForSharing(obj, agreement, sharedBy) {
        // 1. Evaluate policy
        const evaluation = this.policyEvaluator.evaluateShare(obj, agreement);
        if (!evaluation.allowed) {
            throw new Error(`Policy denied: ${evaluation.reason}`);
        }
        if (evaluation.requiresApproval) {
            throw new Error('Object requires manual approval');
        }
        // 2. Apply redactions
        const redactionRules = agreement.policyConstraints.redactionRules || [];
        const redactionResult = this.redactionEngine.applyRedactions(obj.data, redactionRules);
        // 3. Apply type-specific transformations
        const transformedData = this.redactionEngine.applyTypeSpecificTransformations(redactionResult.data, obj.type);
        // 4. Create provenance trail
        const sourceOrg = 'source-org-id'; // TODO: Get from context
        const targetOrg = 'target-org-id'; // TODO: Get from agreement
        const shareRef = this.provenanceTracker.createShareReference(obj.id, obj.type, sourceOrg, targetOrg, agreement.id, sharedBy);
        // 5. Create shared object
        const sharedObject = {
            id: shareRef.id,
            type: obj.type,
            data: transformedData,
            classification: obj.classification,
            jurisdiction: obj.jurisdiction,
            license: agreement.policyConstraints.licenseType,
            originalId: obj.id,
            sourceOrganization: sourceOrg,
            createdAt: obj.createdAt,
            modifiedAt: obj.modifiedAt,
            redactedFields: redactionResult.redactedFields,
            transformationApplied: redactionResult.transformationApplied,
        };
        logger.debug({
            objectId: obj.id,
            shareRefId: shareRef.id,
            redactedFields: redactionResult.redactedFields.length,
        }, 'Object processed for sharing');
        return sharedObject;
    }
    /**
     * Apply filter to objects
     */
    applyFilter(objects, filter) {
        // Simple filter implementation
        // In production, use a proper query engine
        return objects.filter((obj) => {
            for (const [key, value] of Object.entries(filter)) {
                if (key === 'classification') {
                    if (obj.classification !== value) {
                        return false;
                    }
                }
                else if (key === 'jurisdiction') {
                    if (obj.jurisdiction !== value) {
                        return false;
                    }
                }
                else if (key === 'type') {
                    if (obj.type !== value) {
                        return false;
                    }
                }
                // Add more filter criteria as needed
            }
            return true;
        });
    }
    /**
     * Accept a share package (recipient side)
     */
    async acceptSharePackage(pkg, agreement) {
        logger.info({
            packageId: pkg.id,
            objectCount: pkg.objects.length,
        }, 'Accepting share package');
        let imported = 0;
        let failed = 0;
        for (const obj of pkg.objects) {
            try {
                // Verify object meets agreement constraints
                this.verifySharedObject(obj, agreement);
                // Import provenance
                // In production: actually import to prov-ledger
                logger.debug({
                    objectId: obj.id,
                    originalId: obj.originalId,
                }, 'Object accepted');
                imported++;
            }
            catch (error) {
                logger.error({
                    objectId: obj.id,
                    error: error instanceof Error ? error.message : String(error),
                }, 'Failed to accept object');
                failed++;
            }
        }
        logger.info({
            packageId: pkg.id,
            imported,
            failed,
        }, 'Share package processed');
        return { imported, failed };
    }
    /**
     * Verify a shared object meets agreement constraints
     */
    verifySharedObject(obj, agreement) {
        const policy = agreement.policyConstraints;
        // Check object type
        if (!policy.allowedObjectTypes.includes(obj.type)) {
            throw new Error(`Object type ${obj.type} not allowed`);
        }
        // Check classification
        const classOrder = [
            types_js_1.ClassificationLevel.UNCLASSIFIED,
            types_js_1.ClassificationLevel.CUI,
            types_js_1.ClassificationLevel.CONFIDENTIAL,
            types_js_1.ClassificationLevel.SECRET,
            types_js_1.ClassificationLevel.TOP_SECRET,
        ];
        const objIndex = classOrder.indexOf(obj.classification);
        const maxIndex = classOrder.indexOf(policy.maxClassificationLevel);
        if (objIndex > maxIndex) {
            throw new Error(`Object classification ${obj.classification} exceeds max ${policy.maxClassificationLevel}`);
        }
        // Check jurisdiction
        if (!policy.allowedJurisdictions.includes(obj.jurisdiction)) {
            throw new Error(`Jurisdiction ${obj.jurisdiction} not allowed`);
        }
        // All checks passed
    }
}
exports.FederationManager = FederationManager;
