/**
 * Unit Tests: Policy Evaluator
 *
 * Tests SharingAgreement policy evaluation logic.
 */

import { PolicyEvaluator, ShareableObject } from '../../services/policy-evaluator.js';
import {
  SharingAgreement,
  AgreementStatus,
  ShareableObjectType,
  ClassificationLevel,
  Jurisdiction,
  LicenseType,
  SharingMode,
} from '../../models/types.js';

describe('PolicyEvaluator', () => {
  let evaluator: PolicyEvaluator;

  beforeEach(() => {
    evaluator = new PolicyEvaluator();
  });

  describe('evaluateShare', () => {
    it('should allow sharing when all constraints are met', () => {
      const agreement: SharingAgreement = {
        id: 'agreement-1',
        name: 'Test Agreement',
        sourcePartnerId: 'partner-1',
        targetPartnerId: 'partner-2',
        status: AgreementStatus.ACTIVE,
        sharingMode: SharingMode.PUSH,
        policyConstraints: {
          maxClassificationLevel: ClassificationLevel.SECRET,
          allowedJurisdictions: [Jurisdiction.US, Jurisdiction.UK],
          allowedObjectTypes: [ShareableObjectType.ENTITY, ShareableObjectType.ALERT],
          licenseType: LicenseType.TLP_AMBER,
          allowDownstreamSharing: false,
        },
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      };

      const obj: ShareableObject = {
        id: 'obj-1',
        type: ShareableObjectType.ENTITY,
        classification: ClassificationLevel.CONFIDENTIAL,
        jurisdiction: Jurisdiction.US,
        data: { name: 'Test Entity' },
        createdAt: new Date(),
      };

      const result = evaluator.evaluateShare(obj, agreement);

      expect(result.allowed).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('should deny sharing when agreement is not active', () => {
      const agreement: SharingAgreement = {
        id: 'agreement-1',
        name: 'Test Agreement',
        sourcePartnerId: 'partner-1',
        targetPartnerId: 'partner-2',
        status: AgreementStatus.SUSPENDED,
        sharingMode: SharingMode.PUSH,
        policyConstraints: {
          maxClassificationLevel: ClassificationLevel.SECRET,
          allowedJurisdictions: [Jurisdiction.US],
          allowedObjectTypes: [ShareableObjectType.ENTITY],
          licenseType: LicenseType.TLP_AMBER,
          allowDownstreamSharing: false,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const obj: ShareableObject = {
        id: 'obj-1',
        type: ShareableObjectType.ENTITY,
        classification: ClassificationLevel.CONFIDENTIAL,
        jurisdiction: Jurisdiction.US,
        data: {},
        createdAt: new Date(),
      };

      const result = evaluator.evaluateShare(obj, agreement);

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('not active');
    });

    it('should deny sharing when object type not allowed', () => {
      const agreement: SharingAgreement = {
        id: 'agreement-1',
        name: 'Test Agreement',
        sourcePartnerId: 'partner-1',
        targetPartnerId: 'partner-2',
        status: AgreementStatus.ACTIVE,
        sharingMode: SharingMode.PUSH,
        policyConstraints: {
          maxClassificationLevel: ClassificationLevel.SECRET,
          allowedJurisdictions: [Jurisdiction.US],
          allowedObjectTypes: [ShareableObjectType.ENTITY],
          licenseType: LicenseType.TLP_AMBER,
          allowDownstreamSharing: false,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const obj: ShareableObject = {
        id: 'obj-1',
        type: ShareableObjectType.IOC,
        classification: ClassificationLevel.CONFIDENTIAL,
        jurisdiction: Jurisdiction.US,
        data: {},
        createdAt: new Date(),
      };

      const result = evaluator.evaluateShare(obj, agreement);

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('not allowed');
    });

    it('should deny sharing when classification exceeds max level', () => {
      const agreement: SharingAgreement = {
        id: 'agreement-1',
        name: 'Test Agreement',
        sourcePartnerId: 'partner-1',
        targetPartnerId: 'partner-2',
        status: AgreementStatus.ACTIVE,
        sharingMode: SharingMode.PUSH,
        policyConstraints: {
          maxClassificationLevel: ClassificationLevel.CONFIDENTIAL,
          allowedJurisdictions: [Jurisdiction.US],
          allowedObjectTypes: [ShareableObjectType.ENTITY],
          licenseType: LicenseType.TLP_AMBER,
          allowDownstreamSharing: false,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const obj: ShareableObject = {
        id: 'obj-1',
        type: ShareableObjectType.ENTITY,
        classification: ClassificationLevel.SECRET,
        jurisdiction: Jurisdiction.US,
        data: {},
        createdAt: new Date(),
      };

      const result = evaluator.evaluateShare(obj, agreement);

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('exceeds max allowed');
    });

    it('should deny sharing when jurisdiction not allowed', () => {
      const agreement: SharingAgreement = {
        id: 'agreement-1',
        name: 'Test Agreement',
        sourcePartnerId: 'partner-1',
        targetPartnerId: 'partner-2',
        status: AgreementStatus.ACTIVE,
        sharingMode: SharingMode.PUSH,
        policyConstraints: {
          maxClassificationLevel: ClassificationLevel.SECRET,
          allowedJurisdictions: [Jurisdiction.US],
          allowedObjectTypes: [ShareableObjectType.ENTITY],
          licenseType: LicenseType.TLP_AMBER,
          allowDownstreamSharing: false,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const obj: ShareableObject = {
        id: 'obj-1',
        type: ShareableObjectType.ENTITY,
        classification: ClassificationLevel.CONFIDENTIAL,
        jurisdiction: Jurisdiction.EU,
        data: {},
        createdAt: new Date(),
      };

      const result = evaluator.evaluateShare(obj, agreement);

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('jurisdiction');
    });

    it('should flag objects requiring manual approval', () => {
      const agreement: SharingAgreement = {
        id: 'agreement-1',
        name: 'Test Agreement',
        sourcePartnerId: 'partner-1',
        targetPartnerId: 'partner-2',
        status: AgreementStatus.ACTIVE,
        sharingMode: SharingMode.PUSH,
        policyConstraints: {
          maxClassificationLevel: ClassificationLevel.SECRET,
          allowedJurisdictions: [Jurisdiction.US],
          allowedObjectTypes: [ShareableObjectType.ENTITY],
          licenseType: LicenseType.TLP_AMBER,
          allowDownstreamSharing: false,
          requiresApproval: true,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const obj: ShareableObject = {
        id: 'obj-1',
        type: ShareableObjectType.ENTITY,
        classification: ClassificationLevel.CONFIDENTIAL,
        jurisdiction: Jurisdiction.US,
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
      const agreement: SharingAgreement = {
        id: 'agreement-1',
        name: 'Test Agreement',
        sourcePartnerId: 'partner-1',
        targetPartnerId: 'partner-2',
        status: AgreementStatus.ACTIVE,
        sharingMode: SharingMode.PUSH,
        policyConstraints: {
          maxClassificationLevel: ClassificationLevel.SECRET,
          allowedJurisdictions: [Jurisdiction.US],
          allowedObjectTypes: [ShareableObjectType.ENTITY],
          licenseType: LicenseType.TLP_AMBER,
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
      const agreement: SharingAgreement = {
        id: 'agreement-1',
        name: 'Test Agreement',
        sourcePartnerId: 'partner-1',
        targetPartnerId: 'partner-2',
        status: AgreementStatus.ACTIVE,
        sharingMode: SharingMode.PUSH,
        policyConstraints: {
          maxClassificationLevel: ClassificationLevel.SECRET,
          allowedJurisdictions: [Jurisdiction.US],
          allowedObjectTypes: [ShareableObjectType.ENTITY],
          licenseType: LicenseType.TLP_AMBER,
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
      const agreement: SharingAgreement = {
        id: 'agreement-1',
        name: 'Test Agreement',
        sourcePartnerId: 'partner-1',
        targetPartnerId: 'partner-2',
        status: AgreementStatus.ACTIVE,
        sharingMode: SharingMode.PUSH,
        policyConstraints: {
          maxClassificationLevel: ClassificationLevel.SECRET,
          allowedJurisdictions: [Jurisdiction.US],
          allowedObjectTypes: [],
          licenseType: LicenseType.TLP_AMBER,
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
