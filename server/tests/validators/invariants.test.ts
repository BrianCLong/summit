import { MaestroRunStateTransitionSchema, OrganizationStateTransitionSchema } from '../../src/validators/invariants';

describe('Invariants Validators', () => {
  describe('MaestroRunStateTransitionSchema', () => {
    it('should allow valid transitions', () => {
      expect(() => MaestroRunStateTransitionSchema.parse({ currentStatus: 'queued', newStatus: 'running' })).not.toThrow();
      expect(() => MaestroRunStateTransitionSchema.parse({ currentStatus: 'running', newStatus: 'succeeded' })).not.toThrow();
      expect(() => MaestroRunStateTransitionSchema.parse({ currentStatus: 'running', newStatus: 'failed' })).not.toThrow();
      expect(() => MaestroRunStateTransitionSchema.parse({ currentStatus: 'queued', newStatus: 'cancelled' })).not.toThrow();
    });

    it('should disallow invalid transitions', () => {
      expect(() => MaestroRunStateTransitionSchema.parse({ currentStatus: 'succeeded', newStatus: 'running' })).toThrow();
      expect(() => MaestroRunStateTransitionSchema.parse({ currentStatus: 'failed', newStatus: 'queued' })).toThrow();
      expect(() => MaestroRunStateTransitionSchema.parse({ currentStatus: 'queued', newStatus: 'succeeded' })).toThrow(); // Must go through running
    });
  });

  describe('OrganizationStateTransitionSchema', () => {
    it('should allow valid transitions', () => {
      expect(() => OrganizationStateTransitionSchema.parse({ currentStatus: 'active', newStatus: 'suspended' })).not.toThrow();
      expect(() => OrganizationStateTransitionSchema.parse({ currentStatus: 'suspended', newStatus: 'active' })).not.toThrow();
      expect(() => OrganizationStateTransitionSchema.parse({ currentStatus: 'disabled', newStatus: 'archived' })).not.toThrow();
    });

    it('should disallow invalid transitions', () => {
      expect(() => OrganizationStateTransitionSchema.parse({ currentStatus: 'disabled', newStatus: 'active' })).toThrow();
      expect(() => OrganizationStateTransitionSchema.parse({ currentStatus: 'archived', newStatus: 'active' })).toThrow();
    });
  });
});
