/**
 * Integration Tests: Cross-Tenant Exchange
 *
 * Tests end-to-end federation workflows between two organizations.
 */

import { PolicyEvaluator, ShareableObject } from '../../services/policy-evaluator.js';
import { RedactionEngine } from '../../services/redaction-engine.js';
import { ProvenanceTracker } from '../../services/provenance-tracker.js';
import { FederationManager } from '../../services/federation-manager.js';
import { AuditLogger } from '../../services/audit-logger.js';
import {
  SharingAgreement,
  AgreementStatus,
  ShareableObjectType,
  ClassificationLevel,
  Jurisdiction,
  LicenseType,
  SharingMode,
} from '../../models/types.js';

describe('Cross-Tenant Exchange Integration', () => {
  let policyEvaluator: PolicyEvaluator;
  let redactionEngine: RedactionEngine;
  let provenanceTracker: ProvenanceTracker;
  let federationManager: FederationManager;
  let auditLogger: AuditLogger;

  beforeEach(() => {
    policyEvaluator = new PolicyEvaluator();
    redactionEngine = new RedactionEngine();
    provenanceTracker = new ProvenanceTracker();
    federationManager = new FederationManager(
      policyEvaluator,
      redactionEngine,
      provenanceTracker
    );
    auditLogger = new AuditLogger();
  });

  describe('PUSH model: Org A shares alerts with Org B', () => {
    it('should successfully share alerts under active agreement', async () => {
      // Setup: Create agreement between Org A and Org B
      const agreement: SharingAgreement = {
        id: 'agreement-1',
        name: 'Alert Sharing: Org A → Org B',
        sourcePartnerId: 'org-a',
        targetPartnerId: 'org-b',
        status: AgreementStatus.ACTIVE,
        sharingMode: SharingMode.PUSH,
        policyConstraints: {
          maxClassificationLevel: ClassificationLevel.SECRET,
          allowedJurisdictions: [Jurisdiction.US, Jurisdiction.FVEY],
          allowedObjectTypes: [ShareableObjectType.ALERT, ShareableObjectType.IOC],
          redactionRules: [
            {
              field: 'internalCaseId',
              action: 'remove',
            },
            {
              field: 'assignedOfficer',
              action: 'redact',
              replacement: '[REDACTED]',
            },
          ],
          licenseType: LicenseType.TLP_AMBER,
          allowDownstreamSharing: false,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Create test alerts
      const alerts: ShareableObject[] = [
        {
          id: 'alert-1',
          type: ShareableObjectType.ALERT,
          classification: ClassificationLevel.CONFIDENTIAL,
          jurisdiction: Jurisdiction.US,
          data: {
            title: 'Suspicious Network Activity',
            severity: 'HIGH',
            description: 'Detected anomalous traffic pattern',
            internalCaseId: 'CASE-12345',
            assignedOfficer: 'John Doe',
            timestamp: '2024-01-15T10:00:00Z',
          },
          createdAt: new Date('2024-01-15'),
        },
        {
          id: 'alert-2',
          type: ShareableObjectType.ALERT,
          classification: ClassificationLevel.CUI,
          jurisdiction: Jurisdiction.US,
          data: {
            title: 'Malware Detection',
            severity: 'CRITICAL',
            description: 'Known malware hash detected',
            internalCaseId: 'CASE-12346',
            assignedOfficer: 'Jane Smith',
            ioc: 'abc123...',
          },
          createdAt: new Date('2024-01-16'),
        },
      ];

      // Execute: Push share
      const sharePackage = await federationManager.pushShare(
        {
          agreementId: agreement.id,
          objects: alerts,
          sharedBy: 'org-a-analyst',
        },
        agreement
      );

      // Assert: Share package created
      expect(sharePackage.id).toBeDefined();
      expect(sharePackage.objects).toHaveLength(2);
      expect(sharePackage.agreementId).toBe(agreement.id);

      // Assert: Redaction applied
      const sharedAlert1 = sharePackage.objects[0];
      expect(sharedAlert1.data.internalCaseId).toBeUndefined();
      expect(sharedAlert1.data.assignedOfficer).toBe('[REDACTED]');
      expect(sharedAlert1.data.title).toBe('Suspicious Network Activity');

      // Assert: Provenance tracked
      expect(sharePackage.provenanceLinks).toBeDefined();
      expect(sharePackage.provenanceLinks.length).toBeGreaterThan(0);

      // Assert: Original IDs preserved
      expect(sharedAlert1.originalId).toBe('alert-1');
      expect(sharePackage.objects[1].originalId).toBe('alert-2');
    });

    it('should reject sharing when agreement does not allow object type', async () => {
      const agreement: SharingAgreement = {
        id: 'agreement-2',
        name: 'IOC Only Agreement',
        sourcePartnerId: 'org-a',
        targetPartnerId: 'org-b',
        status: AgreementStatus.ACTIVE,
        sharingMode: SharingMode.PUSH,
        policyConstraints: {
          maxClassificationLevel: ClassificationLevel.SECRET,
          allowedJurisdictions: [Jurisdiction.US],
          allowedObjectTypes: [ShareableObjectType.IOC],
          licenseType: LicenseType.TLP_AMBER,
          allowDownstreamSharing: false,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const entities: ShareableObject[] = [
        {
          id: 'entity-1',
          type: ShareableObjectType.ENTITY,
          classification: ClassificationLevel.UNCLASSIFIED,
          jurisdiction: Jurisdiction.US,
          data: { name: 'Test Entity' },
          createdAt: new Date(),
        },
      ];

      await expect(
        federationManager.pushShare(
          {
            agreementId: agreement.id,
            objects: entities,
            sharedBy: 'org-a-analyst',
          },
          agreement
        )
      ).rejects.toThrow();
    });
  });

  describe('PULL model: Org B queries available objects from Org A', () => {
    it('should return filtered objects based on pull query', async () => {
      const agreement: SharingAgreement = {
        id: 'agreement-3',
        name: 'Pull Access: Org B from Org A',
        sourcePartnerId: 'org-a',
        targetPartnerId: 'org-b',
        status: AgreementStatus.ACTIVE,
        sharingMode: SharingMode.PULL,
        policyConstraints: {
          maxClassificationLevel: ClassificationLevel.CONFIDENTIAL,
          allowedJurisdictions: [Jurisdiction.US],
          allowedObjectTypes: [ShareableObjectType.IOC, ShareableObjectType.ENTITY],
          licenseType: LicenseType.TLP_GREEN,
          allowDownstreamSharing: true,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const availableObjects: ShareableObject[] = [
        {
          id: 'ioc-1',
          type: ShareableObjectType.IOC,
          classification: ClassificationLevel.UNCLASSIFIED,
          jurisdiction: Jurisdiction.US,
          data: { hash: 'abc123', type: 'MD5' },
          createdAt: new Date(),
        },
        {
          id: 'ioc-2',
          type: ShareableObjectType.IOC,
          classification: ClassificationLevel.CUI,
          jurisdiction: Jurisdiction.US,
          data: { hash: 'def456', type: 'SHA256' },
          createdAt: new Date(),
        },
        {
          id: 'entity-1',
          type: ShareableObjectType.ENTITY,
          classification: ClassificationLevel.UNCLASSIFIED,
          jurisdiction: Jurisdiction.US,
          data: { name: 'Test Entity' },
          createdAt: new Date(),
        },
      ];

      // Execute: Pull query for IOCs only
      const results = await federationManager.pullQuery(
        {
          agreementId: agreement.id,
          objectTypes: [ShareableObjectType.IOC],
          limit: 10,
        },
        agreement,
        availableObjects
      );

      // Assert: Only IOCs returned
      expect(results).toHaveLength(2);
      expect(results.every((obj) => obj.type === ShareableObjectType.IOC)).toBe(true);
    });
  });

  describe('Provenance and ID Mapping', () => {
    it('should maintain provenance chain across share operations', async () => {
      const agreement: SharingAgreement = {
        id: 'agreement-4',
        name: 'Provenance Test Agreement',
        sourcePartnerId: 'org-a',
        targetPartnerId: 'org-b',
        status: AgreementStatus.ACTIVE,
        sharingMode: SharingMode.PUSH,
        policyConstraints: {
          maxClassificationLevel: ClassificationLevel.SECRET,
          allowedJurisdictions: [Jurisdiction.US],
          allowedObjectTypes: [ShareableObjectType.CASE],
          licenseType: LicenseType.TLP_AMBER,
          allowDownstreamSharing: false,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const cases: ShareableObject[] = [
        {
          id: 'case-1',
          type: ShareableObjectType.CASE,
          classification: ClassificationLevel.CONFIDENTIAL,
          jurisdiction: Jurisdiction.US,
          data: { title: 'Investigation Alpha' },
          createdAt: new Date(),
        },
      ];

      const sharePackage = await federationManager.pushShare(
        {
          agreementId: agreement.id,
          objects: cases,
          sharedBy: 'org-a-analyst',
        },
        agreement
      );

      // Assert: Provenance chain exists
      const provenanceChain = provenanceTracker.getProvenanceChain('case-1');
      expect(provenanceChain.length).toBeGreaterThan(0);

      // Verify chain integrity
      const verification = provenanceTracker.verifyChain('case-1');
      expect(verification.valid).toBe(true);
      expect(verification.errors).toHaveLength(0);
    });
  });

  describe('Redaction Correctness', () => {
    it('should apply redaction rules correctly', async () => {
      const agreement: SharingAgreement = {
        id: 'agreement-5',
        name: 'Redaction Test Agreement',
        sourcePartnerId: 'org-a',
        targetPartnerId: 'org-b',
        status: AgreementStatus.ACTIVE,
        sharingMode: SharingMode.PUSH,
        policyConstraints: {
          maxClassificationLevel: ClassificationLevel.SECRET,
          allowedJurisdictions: [Jurisdiction.US],
          allowedObjectTypes: [ShareableObjectType.DOCUMENT],
          redactionRules: [
            {
              field: 'sensitiveField',
              action: 'redact',
              replacement: '[REDACTED]',
            },
            {
              field: 'personalInfo.ssn',
              action: 'remove',
            },
            {
              field: 'personalInfo.name',
              action: 'pseudonymize',
              replacement: 'Person {id}',
            },
          ],
          licenseType: LicenseType.TLP_RED,
          allowDownstreamSharing: false,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const documents: ShareableObject[] = [
        {
          id: 'doc-1',
          type: ShareableObjectType.DOCUMENT,
          classification: ClassificationLevel.SECRET,
          jurisdiction: Jurisdiction.US,
          data: {
            title: 'Classified Report',
            sensitiveField: 'VERY SECRET DATA',
            personalInfo: {
              name: 'John Doe',
              ssn: '123-45-6789',
              age: 35,
            },
          },
          createdAt: new Date(),
        },
      ];

      const sharePackage = await federationManager.pushShare(
        {
          agreementId: agreement.id,
          objects: documents,
          sharedBy: 'org-a-analyst',
        },
        agreement
      );

      const sharedDoc = sharePackage.objects[0];

      // Assert: Redactions applied
      expect(sharedDoc.data.sensitiveField).toBe('[REDACTED]');
      expect(sharedDoc.data.personalInfo.ssn).toBeUndefined();
      expect(sharedDoc.data.personalInfo.name).toMatch(/Person [A-F0-9]{8}/);
      expect(sharedDoc.data.personalInfo.age).toBe(35); // Not redacted

      // Assert: Redacted fields tracked
      expect(sharedDoc.redactedFields).toContain('sensitiveField');
    });
  });
});
