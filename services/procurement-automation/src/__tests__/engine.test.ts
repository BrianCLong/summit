import { describe, it, expect, beforeEach } from '@jest/globals';
import { ProcurementAutomationEngine } from '../engine.js';
import { OrganizationProfile, SystemProfile } from '../form-autocomplete.js';

describe('ProcurementAutomationEngine', () => {
  let engine: ProcurementAutomationEngine;
  let mockOrganization: OrganizationProfile;
  let mockSystem: SystemProfile;

  beforeEach(() => {
    mockOrganization = {
      name: 'Test Corp',
      address: '123 Test St',
      city: 'Washington',
      state: 'DC',
      zip: '20001',
      country: 'USA',
      phone: '555-0100',
      website: 'https://test.example.com',
      dunsNumber: '123456789',
      cageCode: 'ABC12',
      naicsCodes: ['541511', '541512'],
      authorizedRepresentative: {
        name: 'Jane Doe',
        title: 'CEO',
        email: 'jane@test.example.com',
        phone: '555-0101',
      },
      technicalContact: {
        name: 'John Smith',
        title: 'CTO',
        email: 'john@test.example.com',
        phone: '555-0102',
      },
      securityContact: {
        name: 'Alice Johnson',
        title: 'CISO',
        email: 'alice@test.example.com',
        phone: '555-0103',
      },
    };

    mockSystem = {
      systemName: 'Test System',
      systemAcronym: 'TS',
      systemDescription: 'A test system for unit testing',
      systemType: 'major_application',
      deploymentModel: 'public_cloud',
      cloudProvider: 'AWS',
      cloudRegions: ['us-east-1', 'us-west-2'],
      operationalStatus: 'operational',
      systemBoundary: {
        components: ['Web Server', 'Database', 'API Gateway'],
        dataFlows: ['User -> Web -> API -> DB'],
        externalInterfaces: ['SSO Provider', 'Email Service'],
      },
      dataTypes: ['PII', 'CUI'],
      userTypes: ['Admin', 'User', 'Guest'],
      estimatedUsers: 1000,
      fipsCategory: {
        confidentiality: 'moderate',
        integrity: 'moderate',
        availability: 'low',
      },
    };

    engine = new ProcurementAutomationEngine({
      organization: mockOrganization,
      system: mockSystem,
    });
  });

  describe('quickStart', () => {
    it('should return complete quick start result', () => {
      const result = engine.quickStart({
        title: 'Test FedRAMP Authorization',
        description: 'Testing the quick start feature',
        frameworks: ['FedRAMP_Moderate'],
        dataClassification: 'cui',
      });

      expect(result).toHaveProperty('requestId');
      expect(result).toHaveProperty('requirements');
      expect(result).toHaveProperty('checklist');
      expect(result).toHaveProperty('timeline');
      expect(result).toHaveProperty('forms');
    });

    it('should parse requirements correctly', () => {
      const result = engine.quickStart({
        title: 'Test',
        description: 'Test',
        frameworks: ['FedRAMP_High'],
      });

      expect(result.requirements.frameworks).toContain('FedRAMP_High');
      expect(result.requirements.riskLevel).toBe('high');
    });

    it('should generate checklist for framework', () => {
      const result = engine.quickStart({
        title: 'Test',
        description: 'Test',
        frameworks: ['FedRAMP_Moderate'],
      });

      expect(result.checklist.length).toBeGreaterThan(0);
      expect(result.checklist[0]).toHaveProperty('category');
      expect(result.checklist[0]).toHaveProperty('items');
    });

    it('should generate timeline with milestones', () => {
      const result = engine.quickStart({
        title: 'Test',
        description: 'Test',
        frameworks: ['FedRAMP_Moderate'],
      });

      expect(result.timeline.length).toBeGreaterThan(0);
      expect(result.timeline[0]).toHaveProperty('task');
      expect(result.timeline[0]).toHaveProperty('startDate');
      expect(result.timeline[0]).toHaveProperty('endDate');
    });
  });

  describe('parseRequirements', () => {
    it('should parse text requirements', () => {
      const result = engine.parseRequirements(
        'Need FedRAMP Moderate for CUI data',
      );

      expect(result.frameworks).toContain('FedRAMP_Moderate');
      expect(result.dataClassification).toBe('cui');
    });
  });

  describe('generateChecklist', () => {
    it('should generate framework-specific checklist', () => {
      const checklist = engine.generateChecklist('CMMC_L2');

      expect(checklist.length).toBeGreaterThan(0);
      const docCategory = checklist.find((c) => c.category === 'Documentation');
      expect(docCategory).toBeDefined();
    });
  });

  describe('listFormTemplates', () => {
    it('should return available form templates', () => {
      const templates = engine.listFormTemplates();

      expect(templates.length).toBeGreaterThan(0);
      expect(templates[0]).toHaveProperty('id');
      expect(templates[0]).toHaveProperty('name');
      expect(templates[0]).toHaveProperty('framework');
    });
  });

  describe('autoCompleteForm', () => {
    it('should auto-complete SSP form', () => {
      const result = engine.autoCompleteForm('ssp_fedramp');

      expect(result).toHaveProperty('formId');
      expect(result).toHaveProperty('completionPercentage');
      expect(result).toHaveProperty('fields');
      expect(result.completionPercentage).toBeGreaterThan(0);
    });

    it('should identify fields that need manual review', () => {
      const result = engine.autoCompleteForm('ssp_fedramp');

      expect(result).toHaveProperty('requiresManualReview');
      expect(Array.isArray(result.requiresManualReview)).toBe(true);
    });
  });

  describe('generateDocument', () => {
    it('should generate SSP document', async () => {
      const doc = await engine.generateDocument('SSP');

      expect(doc).toHaveProperty('id');
      expect(doc).toHaveProperty('type');
      expect(doc).toHaveProperty('content');
      expect(doc.type).toBe('SSP');
      expect(doc.content).toContain('System Security Plan');
      expect(doc.content).toContain(mockSystem.systemName);
    });

    it('should generate POA&M document', async () => {
      const doc = await engine.generateDocument('POA_M');

      expect(doc.type).toBe('POA_M');
      expect(doc.content).toContain('Plan of Action and Milestones');
    });
  });

  describe('generateATOPackage', () => {
    it('should generate complete ATO package', async () => {
      const pkg = await engine.generateATOPackage('FedRAMP_Moderate');

      expect(pkg).toHaveProperty('id');
      expect(pkg).toHaveProperty('framework');
      expect(pkg).toHaveProperty('documents');
      expect(pkg).toHaveProperty('controls');
      expect(pkg).toHaveProperty('completionPercentage');
      expect(pkg.framework).toBe('FedRAMP_Moderate');
      expect(pkg.documents.length).toBeGreaterThan(0);
    });
  });

  describe('getControls', () => {
    it('should return controls after quickStart', () => {
      engine.quickStart({
        title: 'Test',
        description: 'Test',
        frameworks: ['FedRAMP_Moderate'],
      });

      const controls = engine.getControls();
      expect(controls.length).toBeGreaterThan(0);
    });
  });

  describe('updateControl', () => {
    it('should update control status', () => {
      engine.quickStart({
        title: 'Test',
        description: 'Test',
        frameworks: ['FedRAMP_Moderate'],
      });

      const controls = engine.getControls();
      const firstControl = controls[0];

      engine.updateControl(firstControl.id, {
        status: 'implemented',
        implementationNarrative: 'Control has been implemented.',
      });

      const updatedControls = engine.getControls();
      const updated = updatedControls.find((c) => c.id === firstControl.id);
      expect(updated?.status).toBe('implemented');
      expect(updated?.implementationNarrative).toBe(
        'Control has been implemented.',
      );
    });
  });
});
