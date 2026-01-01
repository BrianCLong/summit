// src/context/capsules/__tests__/ic3-system.test.ts
// Unit tests for Invariant-Carrying Context Capsules (IC³) system

import { IC3System, ContextContent, InvariantSpec, EnforcementAction } from '../index';

describe('IC3System', () => {
  let ic3System: IC3System;
  
  beforeEach(() => {
    ic3System = new IC3System();
  });
  
  describe('Context Capsule Creation', () => {
    it('should create a basic context capsule with given content', async () => {
      const content: ContextContent = {
        type: 'text',
        data: 'Hello, this is a test context.'
      };
      
      const spec: InvariantSpec = {
        language: 'ic3-text-filter',
        expression: JSON.stringify({
          type: 'forbidden-words',
          words: ['badword']
        })
      };
      
      const capsule = await ic3System.createContextCapsule(content, [spec]);
      
      expect(capsule).toBeDefined();
      expect(capsule.id).toBeDefined();
      expect(capsule.content).toEqual(content);
      expect(capsule.invariants.length).toBe(1);
      expect(capsule.signature).toBeDefined();
      expect(capsule.timestamp).toBeDefined();
    });
    
    it('should create a capsule with no invariants', async () => {
      const content: ContextContent = {
        type: 'text',
        data: 'Content without invariants'
      };
      
      const capsule = await ic3System.createContextCapsule(content, []);
      
      expect(capsule).toBeDefined();
      expect(capsule.invariants.length).toBe(0);
    });
    
    it('should create a secure capsule with default security invariants', async () => {
      const content: ContextContent = {
        type: 'text',
        data: 'Secure content'
      };
      
      const capsule = await ic3System.createSecureCapsule(content);
      
      expect(capsule).toBeDefined();
      expect(capsule.invariants.length).toBeGreaterThan(0);
      // Check that security-related invariants were included
      expect(capsule.invariants.some(inv => inv.type === 'sensitive-data' || inv.type === 'content-class')).toBe(true);
    });
  });
  
  describe('Capsule Validation', () => {
    it('should validate a properly formed capsule', async () => {
      const content: ContextContent = {
        type: 'text',
        data: 'Valid content'
      };
      
      const spec: InvariantSpec = {
        language: 'ic3-text-filter',
        expression: JSON.stringify({
          type: 'forbidden-words',
          words: ['forbidden']
        })
      };
      
      const capsule = await ic3System.createContextCapsule(content, [spec]);
      const result = await ic3System.validateCapsule(capsule);
      
      expect(result.isValid).toBe(true);
      expect(result.violations.length).toBe(0);
      expect(result.enforcementRecommendation).toBe('approve');
    });
    
    it('should detect violations of text filter invariants', async () => {
      const content: ContextContent = {
        type: 'text',
        data: 'This contains a forbidden word'
      };
      
      const spec: InvariantSpec = {
        language: 'ic3-text-filter',
        expression: JSON.stringify({
          type: 'forbidden-words',
          words: ['forbidden']
        })
      };
      
      const capsule = await ic3System.createContextCapsule(content, [spec]);
      const result = await ic3System.validateCapsule(capsule);
      
      expect(result.isValid).toBe(false);
      expect(result.violations.length).toBeGreaterThan(0);
      expect(result.violations[0].details).toContain('not satisfied by capsule content');
    });
    
    it('should validate multiple capsules in a set', async () => {
      const content1: ContextContent = {
        type: 'text',
        data: 'Valid content 1'
      };
      
      const content2: ContextContent = {
        type: 'text',
        data: 'Valid content 2'
      };
      
      const spec: InvariantSpec = {
        language: 'ic3-text-filter',
        expression: JSON.stringify({
          type: 'forbidden-words',
          words: ['evil']
        })
      };
      
      const capsule1 = await ic3System.createContextCapsule(content1, [spec]);
      const capsule2 = await ic3System.createContextCapsule(content2, [spec]);
      
      const result = await ic3System.validateCapsuleSet([capsule1, capsule2]);
      
      expect(result.isValid).toBe(true);
      expect(result.violations.length).toBe(0);
    });
  });
  
  describe('Capsule Merging', () => {
    it('should merge multiple capsules into a single capsule', async () => {
      const content1: ContextContent = {
        type: 'text',
        data: 'First part of content'
      };
      
      const content2: ContextContent = {
        type: 'text',
        data: 'Second part of content'
      };
      
      const spec1: InvariantSpec = {
        language: 'ic3-text-filter',
        expression: JSON.stringify({
          type: 'forbidden-words',
          words: ['bad1']
        })
      };
      
      const spec2: InvariantSpec = {
        language: 'ic3-text-filter',
        expression: JSON.stringify({
          type: 'forbidden-words',
          words: ['bad2']
        })
      };
      
      const capsule1 = await ic3System.createContextCapsule(content1, [spec1]);
      const capsule2 = await ic3System.createContextCapsule(content2, [spec2]);
      
      const mergedCapsule = await ic3System.mergeCapsules([capsule1, capsule2]);
      
      expect(mergedCapsule).toBeDefined();
      if (mergedCapsule) {
        expect(mergedCapsule.id).not.toEqual(capsule1.id);
        expect(mergedCapsule.id).not.toEqual(capsule2.id);
        expect((mergedCapsule.content.data as string)).toContain('First part of content');
        expect((mergedCapsule.content.data as string)).toContain('Second part of content');
        expect(mergedCapsule.invariants.length).toEqual(2);
      }
    });
    
    it('should return null for empty capsule array', async () => {
      const result = await ic3System.mergeCapsules([]);
      expect(result).toBeNull();
    });
  });
  
  describe('Capsule Update', () => {
    it('should update capsule content while preserving invariants', async () => {
      const initialContent: ContextContent = {
        type: 'text',
        data: 'Old content'
      };
      
      const newContent: ContextContent = {
        type: 'text',
        data: 'New content'
      };
      
      const spec: InvariantSpec = {
        language: 'ic3-text-filter',
        expression: JSON.stringify({
          type: 'forbidden-words',
          words: ['bad']
        })
      };
      
      const initialCapsule = await ic3System.createContextCapsule(initialContent, [spec]);
      const updatedCapsule = await ic3System.updateCapsule(initialCapsule, newContent);
      
      expect(updatedCapsule.id).toEqual(initialCapsule.id);
      expect(updatedCapsule.content.data).toEqual('New content');
      expect(updatedCapsule.invariants).toEqual(initialCapsule.invariants);
      expect(updatedCapsule.timestamp.getTime()).toBeGreaterThan(initialCapsule.timestamp.getTime());
    });
  });
  
  describe('Pre-Execution Validation', () => {
    it('should return appropriate action for valid capsules', async () => {
      const content: ContextContent = {
        type: 'text',
        data: 'Valid content for execution'
      };
      
      const spec: InvariantSpec = {
        language: 'ic3-text-filter',
        expression: JSON.stringify({
          type: 'forbidden-words',
          words: ['not-present']
        })
      };
      
      const capsule = await ic3System.createContextCapsule(content, [spec]);
      const result = await ic3System.preExecutionValidation([capsule]);
      
      expect(result.isValid).toBe(true);
      expect(result.action).toBe('approve');
      expect(result.violations.length).toBe(0);
    });
    
    it('should return reject action for capsules with violations', async () => {
      const content: ContextContent = {
        type: 'text',
        data: 'Content with forbidden word'
      };
      
      const spec: InvariantSpec = {
        language: 'ic3-text-filter',
        expression: JSON.stringify({
          type: 'forbidden-words',
          words: ['forbidden']
        })
      };
      
      const capsule = await ic3System.createContextCapsule(content, [spec]);
      const result = await ic3System.preExecutionValidation([capsule]);
      
      expect(result.isValid).toBe(false);
      expect(result.action).toBe('reject');
      expect(result.violations.length).toBeGreaterThan(0);
    });
  });
  
  describe('Invariant Generation', () => {
    it('should generate an invariant from specification', async () => {
      const spec: InvariantSpec = {
        language: 'ic3-size-limit',
        expression: JSON.stringify({
          type: 'size-limit',
          maxSize: 1000
        })
      };
      
      const invariant = await ic3System.generateInvariant(spec, 'system');
      
      expect(invariant).toBeDefined();
      expect(invariant.id).toBeDefined();
      expect(invariant.type).toBe('context-size'); // Inferred from spec
      expect(invariant.specification).toEqual(spec);
      expect(invariant.signature).toBeDefined();
    });
  });
});