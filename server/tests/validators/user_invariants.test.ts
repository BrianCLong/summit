import { UserStateTransitionSchema } from '../../src/validators/invariants';

describe('User Invariants Validators', () => {
  describe('UserStateTransitionSchema', () => {
    it('should allow valid transitions', () => {
      expect(() => UserStateTransitionSchema.parse({ currentStatus: 'invited', newStatus: 'active' })).not.toThrow();
      expect(() => UserStateTransitionSchema.parse({ currentStatus: 'active', newStatus: 'locked' })).not.toThrow();
      expect(() => UserStateTransitionSchema.parse({ currentStatus: 'active', newStatus: 'deactivated' })).not.toThrow();
      expect(() => UserStateTransitionSchema.parse({ currentStatus: 'deactivated', newStatus: 'active' })).not.toThrow();
    });

    it('should disallow invalid transitions', () => {
      // Cannot go from invited to locked directly without being active first
      expect(() => UserStateTransitionSchema.parse({ currentStatus: 'invited', newStatus: 'locked' })).toThrow();
    });
  });
});
