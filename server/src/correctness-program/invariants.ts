import {
  BulkOperationGuardrail,
  DomainName,
  InvariantDefinition,
  InvariantViolation,
  StateMachineDefinition,
  StateTransition,
  newIdentifier,
} from './types';

export class InvariantRegistry {
  private invariants = new Map<string, InvariantDefinition>();
  private stateMachines = new Map<string, StateMachineDefinition>();
  private idempotencyCache = new Map<string, any>();
  private violations: InvariantViolation[] = [];
  private quarantinedRecords = new Map<string, any>();

  registerInvariant(definition: InvariantDefinition) {
    this.invariants.set(definition.id, definition);
  }

  registerStateMachine(machine: StateMachineDefinition) {
    if (!machine.states.includes(machine.initialState)) {
      throw new Error(`Initial state ${machine.initialState} not part of machine ${machine.id}`);
    }
    this.stateMachines.set(machine.id, machine);
  }

  getStateMachine(id: string): StateMachineDefinition | undefined {
    return this.stateMachines.get(id);
  }

  validateStateTransition(machineId: string, from: string, to: string, payload?: any) {
    const machine = this.stateMachines.get(machineId);
    if (!machine) throw new Error(`Unknown state machine ${machineId}`);
    const transition = machine.transitions.find((t) => t.from === from && t.to === to);
    if (!transition || !transition.allowed) {
      throw new Error(`Transition from ${from} to ${to} is not allowed for ${machineId}`);
    }
    if (transition.guard && !transition.guard(payload)) {
      throw new Error(`Guard prevented transition for ${machineId}`);
    }
    return true;
  }

  async validateWrite(domain: DomainName, payload: any, idempotencyKey?: string) {
    if (idempotencyKey && this.idempotencyCache.has(idempotencyKey)) {
      return { idempotent: true, violations: [] as InvariantViolation[] };
    }

    const violations: InvariantViolation[] = [];
    const invariantDefs = Array.from(this.invariants.values()).filter((i) => i.domain === domain);
    for (const invariant of invariantDefs) {
      const isValid = await invariant.validate(payload);
      if (!isValid) {
        const violation: InvariantViolation = {
          id: newIdentifier(),
          invariantId: invariant.id,
          domain,
          input: payload,
          occurredAt: new Date(),
          quarantined: invariant.severity === 'critical',
          message: invariant.description,
        };
        violations.push(violation);
        this.violations.push(violation);
        if (violation.quarantined) {
          this.quarantinedRecords.set(violation.id, payload);
        }
      }
    }

    if (idempotencyKey) {
      this.idempotencyCache.set(idempotencyKey, { payload, violations });
    }

    return { idempotent: false, violations };
  }

  guardBulkOperation<TInput>(guardrail: BulkOperationGuardrail<TInput>) {
    const diffPreview = guardrail.plannedChanges.map((change) => JSON.stringify(change));
    const approvalRequired = guardrail.plannedChanges.length > 10 || diffPreview.join('').length > 10_000;
    if (approvalRequired && !guardrail.approver) {
      throw new Error('High-risk bulk operations require an approver');
    }

    return {
      approvalRequired,
      approvedBy: guardrail.approver,
      dryRun: guardrail.dryRun,
      diffPreview,
    };
  }

  violationsByDomain(domain: DomainName): InvariantViolation[] {
    return this.violations.filter((v) => v.domain === domain);
  }

  getQuarantine(): Record<string, any>[] {
    return Array.from(this.quarantinedRecords.entries()).map(([id, record]) => ({ id, record }));
  }
}

export const buildBooleanStateMachine = (
  id: string,
  domain: DomainName,
  activeState: string,
  inactiveState: string,
): StateMachineDefinition => ({
  id,
  domain,
  states: [activeState, inactiveState],
  transitions: [
    { from: inactiveState, to: activeState, allowed: true },
    { from: activeState, to: inactiveState, allowed: true },
  ],
  initialState: inactiveState,
});
