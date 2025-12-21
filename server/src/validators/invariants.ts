import { z } from 'zod';

export const MaestroRunStatusSchema = z.enum(['queued', 'running', 'succeeded', 'failed', 'cancelled']);

export const MaestroRunStateTransitionSchema = z.object({
  currentStatus: MaestroRunStatusSchema,
  newStatus: MaestroRunStatusSchema,
}).refine((data) => {
  const { currentStatus, newStatus } = data;
  if (currentStatus === newStatus) return true; // No-op is valid

  const terminalStates = ['succeeded', 'failed', 'cancelled'];
  if (terminalStates.includes(currentStatus)) {
    return false; // Cannot transition from terminal state
  }

  const validTransitions: Record<string, string[]> = {
    queued: ['running', 'cancelled'],
    running: ['succeeded', 'failed', 'cancelled'],
  };

  return validTransitions[currentStatus]?.includes(newStatus) ?? false;
}, {
  message: "Invalid state transition for MaestroRun",
});

export const OrganizationStatusSchema = z.enum(['active', 'suspended', 'disabled', 'archived']);

export const OrganizationStateTransitionSchema = z.object({
  currentStatus: OrganizationStatusSchema,
  newStatus: OrganizationStatusSchema,
}).refine((data) => {
  const { currentStatus, newStatus } = data;
  if (currentStatus === newStatus) return true;

  const validTransitions: Record<string, string[]> = {
    active: ['suspended', 'disabled'],
    suspended: ['active', 'disabled'],
    disabled: ['archived'], // Cannot go back to active/suspended
    archived: [],
  };

  return validTransitions[currentStatus]?.includes(newStatus) ?? false;
}, {
  message: "Invalid state transition for Organization",
});

export const UserStatusSchema = z.enum(['invited', 'active', 'locked', 'deactivated']);

export const UserStateTransitionSchema = z.object({
  currentStatus: UserStatusSchema,
  newStatus: UserStatusSchema,
}).refine((data) => {
  const { currentStatus, newStatus } = data;
  if (currentStatus === newStatus) return true;

  const validTransitions: Record<string, string[]> = {
    invited: ['active', 'deactivated'],
    active: ['locked', 'deactivated'],
    locked: ['active', 'deactivated'],
    deactivated: ['active'], // Reactivation allowed via admin/support
  };

  return validTransitions[currentStatus]?.includes(newStatus) ?? false;
}, {
  message: "Invalid state transition for User",
});
