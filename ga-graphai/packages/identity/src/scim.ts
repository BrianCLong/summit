import { randomUUID } from 'node:crypto';
import type { AuditLogEvent } from 'common-types';
import { AuditBus } from './audit.js';
import type { IdentityUser, ScimGroup } from './types.js';

export class ScimProvisioner {
  private readonly users = new Map<string, IdentityUser>();
  private readonly groups = new Map<string, ScimGroup>();
  private readonly audit: AuditBus;

  constructor(audit: AuditBus) {
    this.audit = audit;
  }

  upsertUser(payload: Omit<IdentityUser, 'id'> & { id?: string }): IdentityUser {
    const id = payload.id ?? randomUUID();
    const existing = this.users.get(id);
    const user: IdentityUser = {
      ...payload,
      id,
      deprovisionedAt: null,
    };
    this.users.set(id, user);
    const action = existing ? 'user.provisioned' : 'user.created';
    this.audit.emit(this.auditEvent(action, user));
    return user;
  }

  deprovisionUser(id: string): IdentityUser | null {
    const user = this.users.get(id);
    if (!user) return null;
    user.deprovisionedAt = new Date().toISOString();
    this.users.set(id, user);
    this.audit.emit(this.auditEvent('user.deprovisioned', user));
    return user;
  }

  upsertGroup(payload: Omit<ScimGroup, 'id'> & { id?: string }): ScimGroup {
    const id = payload.id ?? randomUUID();
    const group: ScimGroup = { ...payload, id };
    this.groups.set(id, group);
    this.audit.emit({
      action: 'group.updated',
      tenant: group.tenantId,
      actor: 'scim',
      resource: group.id,
    });
    return group;
  }

  getUser(id: string): IdentityUser | undefined {
    return this.users.get(id);
  }

  listGroups(): ScimGroup[] {
    return [...this.groups.values()];
  }

  assertActiveUser(email: string): IdentityUser {
    const user = [...this.users.values()].find((candidate) => candidate.email === email);
    if (!user) {
      throw new Error('User not provisioned');
    }
    if (user.deprovisionedAt) {
      throw new Error('User deprovisioned');
    }
    return user;
  }

  private auditEvent(action: string, user: IdentityUser): AuditLogEvent {
    return {
      action,
      actor: 'scim',
      tenant: user.tenantId,
      resource: user.id,
      details: { email: user.email },
    };
  }
}
