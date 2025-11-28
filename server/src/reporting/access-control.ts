import { AccessContext, AccessRule } from './types';

export class AccessControlService {
  constructor(private readonly rules: AccessRule[]) {}

  ensureAuthorized(context: AccessContext, resource: string, action: AccessRule['action']) {
    const allowed = this.rules.some(
      (rule) =>
        rule.resource === resource &&
        rule.action === action &&
        rule.roles.some((role) => context.roles.includes(role)),
    );
    if (!allowed) {
      throw new Error(`User ${context.userId} is not permitted to ${action} ${resource}`);
    }
  }
}
