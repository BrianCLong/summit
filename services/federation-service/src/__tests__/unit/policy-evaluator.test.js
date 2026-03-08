"use strict";
/**
 * Unit Tests: Policy Evaluator
 *
 * Tests SharingAgreement policy evaluation logic.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const policy_evaluator_js_1 = require("../../services/policy-evaluator.js");
const types_js_1 = require("../../models/types.js");
describe('PolicyEvaluator', () => {
    let evaluator;
    beforeEach(() => {
        evaluator = new policy_evaluator_js_1.PolicyEvaluator();
    });
    describe('evaluateShare', () => {
        it('should allow sharing when all constraints are met', () => {
            const agreement = {
                id: 'agreement-1',
                name: 'Test Agreement',
                sourcePartnerId: 'partner-1',
                targetPartnerId: 'partner-2',
                status: types_js_1.AgreementStatus.ACTIVE,
                sharingMode: types_js_1.SharingMode.PUSH,
                policyConstraints: {
                    maxClassificationLevel: types_js_1.ClassificationLevel.SECRET,
                    allowedJurisdictions: [types_js_1.Jurisdiction.US, types_js_1.Jurisdiction.UK],
                    allowedObjectTypes: [types_js_1.ShareableObjectType.ENTITY, types_js_1.ShareableObjectType.ALERT],
                    licenseType: types_js_1.LicenseType.TLP_AMBER,
                    allowDownstreamSharing: false,
                },
                createdAt: new Date('2024-01-01'),
                updatedAt: new Date('2024-01-01'),
            };
            const obj = {
                id: 'obj-1',
                type: types_js_1.ShareableObjectType.ENTITY,
                classification: types_js_1.ClassificationLevel.CONFIDENTIAL,
                jurisdiction: types_js_1.Jurisdiction.US,
                data: { name: 'Test Entity' },
                createdAt: new Date(),
            };
            const result = evaluator.evaluateShare(obj, agreement);
            expect(result.allowed).toBe(true);
            expect(result.reason).toBeUndefined();
        });
        it('should deny sharing when agreement is not active', () => {
            const agreement = {
                id: 'agreement-1',
                name: 'Test Agreement',
                sourcePartnerId: 'partner-1',
                targetPartnerId: 'partner-2',
                status: types_js_1.AgreementStatus.SUSPENDED,
                sharingMode: types_js_1.SharingMode.PUSH,
                policyConstraints: {
                    maxClassificationLevel: types_js_1.ClassificationLevel.SECRET,
                    allowedJurisdictions: [types_js_1.Jurisdiction.US],
                    allowedObjectTypes: [types_js_1.ShareableObjectType.ENTITY],
                    licenseType: types_js_1.LicenseType.TLP_AMBER,
                    allowDownstreamSharing: false,
                },
                createdAt: new Date(),
                updatedAt: new Date(),
            };
            const obj = {
                id: 'obj-1',
                type: types_js_1.ShareableObjectType.ENTITY,
                classification: types_js_1.ClassificationLevel.CONFIDENTIAL,
                jurisdiction: types_js_1.Jurisdiction.US,
                data: {},
                createdAt: new Date(),
            };
            const result = evaluator.evaluateShare(obj, agreement);
            expect(result.allowed).toBe(false);
            expect(result.reason).toContain('not active');
        });
        it('should deny sharing when object type not allowed', () => {
            const agreement = {
                id: 'agreement-1',
                name: 'Test Agreement',
                sourcePartnerId: 'partner-1',
                targetPartnerId: 'partner-2',
                status: types_js_1.AgreementStatus.ACTIVE,
                sharingMode: types_js_1.SharingMode.PUSH,
                policyConstraints: {
                    maxClassificationLevel: types_js_1.ClassificationLevel.SECRET,
                    allowedJurisdictions: [types_js_1.Jurisdiction.US],
                    allowedObjectTypes: [types_js_1.ShareableObjectType.ENTITY],
                    licenseType: types_js_1.LicenseType.TLP_AMBER,
                    allowDownstreamSharing: false,
                },
                createdAt: new Date(),
                updatedAt: new Date(),
            };
            const obj = {
                id: 'obj-1',
                type: types_js_1.ShareableObjectType.IOC,
                classification: types_js_1.ClassificationLevel.CONFIDENTIAL,
                jurisdiction: types_js_1.Jurisdiction.US,
                data: {},
                createdAt: new Date(),
            };
            const result = evaluator.evaluateShare(obj, agreement);
            expect(result.allowed).toBe(false);
            expect(result.reason).toContain('not allowed');
        });
        it('should deny sharing when classification exceeds max level', () => {
            const agreement = {
                id: 'agreement-1',
                name: 'Test Agreement',
                sourcePartnerId: 'partner-1',
                targetPartnerId: 'partner-2',
                status: types_js_1.AgreementStatus.ACTIVE,
                sharingMode: types_js_1.SharingMode.PUSH,
                policyConstraints: {
                    maxClassificationLevel: types_js_1.ClassificationLevel.CONFIDENTIAL,
                    allowedJurisdictions: [types_js_1.Jurisdiction.US],
                    allowedObjectTypes: [types_js_1.ShareableObjectType.ENTITY],
                    licenseType: types_js_1.LicenseType.TLP_AMBER,
                    allowDownstreamSharing: false,
                },
                createdAt: new Date(),
                updatedAt: new Date(),
            };
            const obj = {
                id: 'obj-1',
                type: types_js_1.ShareableObjectType.ENTITY,
                classification: types_js_1.ClassificationLevel.SECRET,
                jurisdiction: types_js_1.Jurisdiction.US,
                data: {},
                createdAt: new Date(),
            };
            const result = evaluator.evaluateShare(obj, agreement);
            expect(result.allowed).toBe(false);
            expect(result.reason).toContain('exceeds max allowed');
        });
        it('should deny sharing when jurisdiction not allowed', () => {
            const agreement = {
                id: 'agreement-1',
                name: 'Test Agreement',
                sourcePartnerId: 'partner-1',
                targetPartnerId: 'partner-2',
                status: types_js_1.AgreementStatus.ACTIVE,
                sharingMode: types_js_1.SharingMode.PUSH,
                policyConstraints: {
                    maxClassificationLevel: types_js_1.ClassificationLevel.SECRET,
                    allowedJurisdictions: [types_js_1.Jurisdiction.US],
                    allowedObjectTypes: [types_js_1.ShareableObjectType.ENTITY],
                    licenseType: types_js_1.LicenseType.TLP_AMBER,
                    allowDownstreamSharing: false,
                },
                createdAt: new Date(),
                updatedAt: new Date(),
            };
            const obj = {
                id: 'obj-1',
                type: types_js_1.ShareableObjectType.ENTITY,
                classification: types_js_1.ClassificationLevel.CONFIDENTIAL,
                jurisdiction: types_js_1.Jurisdiction.EU,
                data: {},
                createdAt: new Date(),
            };
            const result = evaluator.evaluateShare(obj, agreement);
            expect(result.allowed).toBe(false);
            expect(result.reason).toContain('jurisdiction');
        });
        it('should flag objects requiring manual approval', () => {
            const agreement = {
                id: 'agreement-1',
                name: 'Test Agreement',
                sourcePartnerId: 'partner-1',
                targetPartnerId: 'partner-2',
                status: types_js_1.AgreementStatus.ACTIVE,
                sharingMode: types_js_1.SharingMode.PUSH,
                policyConstraints: {
                    maxClassificationLevel: types_js_1.ClassificationLevel.SECRET,
                    allowedJurisdictions: [types_js_1.Jurisdiction.US],
                    allowedObjectTypes: [types_js_1.ShareableObjectType.ENTITY],
                    licenseType: types_js_1.LicenseType.TLP_AMBER,
                    allowDownstreamSharing: false,
                    requiresApproval: true,
                },
                createdAt: new Date(),
                updatedAt: new Date(),
            };
            const obj = {
                id: 'obj-1',
                type: types_js_1.ShareableObjectType.ENTITY,
                classification: types_js_1.ClassificationLevel.CONFIDENTIAL,
                jurisdiction: types_js_1.Jurisdiction.US,
                data: {},
                createdAt: new Date(),
            };
            const result = evaluator.evaluateShare(obj, agreement);
            expect(result.allowed).toBe(true);
            expect(result.requiresApproval).toBe(true);
        });
    });
    describe('validateAgreement', () => {
        it('should validate a correct agreement', () => {
            const agreement = {
                id: 'agreement-1',
                name: 'Test Agreement',
                sourcePartnerId: 'partner-1',
                targetPartnerId: 'partner-2',
                status: types_js_1.AgreementStatus.ACTIVE,
                sharingMode: types_js_1.SharingMode.PUSH,
                policyConstraints: {
                    maxClassificationLevel: types_js_1.ClassificationLevel.SECRET,
                    allowedJurisdictions: [types_js_1.Jurisdiction.US],
                    allowedObjectTypes: [types_js_1.ShareableObjectType.ENTITY],
                    licenseType: types_js_1.LicenseType.TLP_AMBER,
                    allowDownstreamSharing: false,
                },
                effectiveDate: new Date('2024-01-01'),
                expirationDate: new Date('2025-01-01'),
                createdAt: new Date(),
                updatedAt: new Date(),
            };
            const result = evaluator.validateAgreement(agreement);
            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });
        it('should reject agreement with invalid dates', () => {
            const agreement = {
                id: 'agreement-1',
                name: 'Test Agreement',
                sourcePartnerId: 'partner-1',
                targetPartnerId: 'partner-2',
                status: types_js_1.AgreementStatus.ACTIVE,
                sharingMode: types_js_1.SharingMode.PUSH,
                policyConstraints: {
                    maxClassificationLevel: types_js_1.ClassificationLevel.SECRET,
                    allowedJurisdictions: [types_js_1.Jurisdiction.US],
                    allowedObjectTypes: [types_js_1.ShareableObjectType.ENTITY],
                    licenseType: types_js_1.LicenseType.TLP_AMBER,
                    allowDownstreamSharing: false,
                },
                effectiveDate: new Date('2025-01-01'),
                expirationDate: new Date('2024-01-01'),
                createdAt: new Date(),
                updatedAt: new Date(),
            };
            const result = evaluator.validateAgreement(agreement);
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Effective date must be before expiration date');
        });
        it('should reject agreement with no allowed object types', () => {
            const agreement = {
                id: 'agreement-1',
                name: 'Test Agreement',
                sourcePartnerId: 'partner-1',
                targetPartnerId: 'partner-2',
                status: types_js_1.AgreementStatus.ACTIVE,
                sharingMode: types_js_1.SharingMode.PUSH,
                policyConstraints: {
                    maxClassificationLevel: types_js_1.ClassificationLevel.SECRET,
                    allowedJurisdictions: [types_js_1.Jurisdiction.US],
                    allowedObjectTypes: [],
                    licenseType: types_js_1.LicenseType.TLP_AMBER,
                    allowDownstreamSharing: false,
                },
                createdAt: new Date(),
                updatedAt: new Date(),
            };
            const result = evaluator.validateAgreement(agreement);
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('At least one object type must be allowed');
        });
    });
});
