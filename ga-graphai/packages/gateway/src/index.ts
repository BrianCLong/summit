import type {
  AssignmentPlan,
  AutomationCommand,
  AutomationMode,
  ManualControlPlan,
  TicketDescriptor,
  WorkParcelPlan,
  WorkerDescriptor,
} from '../../common-types/src/index.js';

interface ManualOverride {
  readonly ticketId: string;
  readonly workerId: string;
}

const DEFAULT_GUIDED_PLAN: ManualControlPlan = {
  mode: 'guided',
  pauseBeforeNavigation: false,
  pauseBeforePrompt: true,
  pauseBeforeCapture: true,
};

const DEFAULT_MANUAL_PLAN: ManualControlPlan = {
  mode: 'manual',
  pauseBeforeNavigation: true,
  pauseBeforePrompt: true,
  pauseBeforeCapture: true,
};

const DEFAULT_AUTOMATION_PLAN: ManualControlPlan = {
  mode: 'auto',
  pauseBeforeNavigation: false,
  pauseBeforePrompt: false,
  pauseBeforeCapture: false,
};

function capabilityScore(ticket: TicketDescriptor, worker: WorkerDescriptor): number {
  const required = new Set(ticket.requiredCapabilities.map((cap) => cap.toLowerCase()));
  return worker.capabilities.reduce((score, capability) => {
    if (required.has(capability.skill.toLowerCase())) {
      return score + capability.weight;
    }
    return score;
  }, 0);
}

function automationPlanFor(mode: AutomationMode): ManualControlPlan {
  switch (mode) {
    case 'manual':
      return DEFAULT_MANUAL_PLAN;
    case 'guided':
      return DEFAULT_GUIDED_PLAN;
    default:
      return DEFAULT_AUTOMATION_PLAN;
  }
}

export class WorkloadAllocator {
  private readonly overrides = new Map<string, string>();

  constructor(private readonly workers: readonly WorkerDescriptor[]) {
    if (!workers.length) {
      throw new Error('WorkloadAllocator requires at least one worker profile');
    }
  }

  public registerOverrides(overrides: readonly ManualOverride[]): void {
    overrides.forEach((override) => {
      this.overrides.set(override.ticketId, override.workerId);
    });
  }

  public plan(tickets: readonly TicketDescriptor[]): AssignmentPlan {
    const parcels: WorkParcelPlan[] = [];
    const unassigned: TicketDescriptor[] = [];
    const mutableWorkers = this.workers.map((worker) => ({ ...worker }));

    tickets
      .slice()
      .sort((a, b) => b.priority - a.priority)
      .forEach((ticket) => {
        const parcel = this.planTicket(ticket, mutableWorkers);
        if (parcel) {
          parcels.push(parcel);
        } else {
          unassigned.push(ticket);
        }
      });

    return { parcels, unassigned };
  }

  private planTicket(
    ticket: TicketDescriptor,
    workers: WorkerDescriptor[],
  ): WorkParcelPlan | undefined {
    const overrideWorkerId = this.overrides.get(ticket.id);
    const eligibleWorkers = workers
      .filter((worker) => worker.currentLoad < worker.maxConcurrent)
      .map((worker) => ({
        worker,
        score: capabilityScore(ticket, worker),
        remainingCapacity: worker.maxConcurrent - worker.currentLoad,
      }))
      .filter((entry) => entry.score > 0 || Boolean(overrideWorkerId));

    if (!eligibleWorkers.length) {
      return undefined;
    }

    let selection = eligibleWorkers[0];
    if (overrideWorkerId) {
      const overridden = eligibleWorkers.find((entry) => entry.worker.id === overrideWorkerId);
      if (overridden) {
        selection = overridden;
      }
    } else {
      selection = eligibleWorkers
        .slice()
        .sort((a, b) => {
          if (b.score === a.score) {
            return b.remainingCapacity - a.remainingCapacity;
          }
          return b.score - a.score;
        })[0];
    }

    selection.worker.currentLoad += 1;

    return {
      ticket,
      worker: selection.worker,
      manualControl: automationPlanFor(ticket.automationMode),
      expectedEffortMinutes: this.estimateEffort(ticket),
    };
  }

  private estimateEffort(ticket: TicketDescriptor): number {
    const base = 30;
    const priorityAdjustment = Math.max(0, ticket.priority - 1) * 5;
    const manualMultiplier = ticket.automationMode === 'manual' ? 2 : ticket.automationMode === 'guided' ? 1.3 : 1;
    return Math.ceil((base + priorityAdjustment) * manualMultiplier);
  }
}

export class AutomationCommandBuilder {
  constructor(private readonly allocator: WorkloadAllocator) {}

  public createCommands(tickets: readonly TicketDescriptor[]): AutomationCommand[] {
    const plan = this.allocator.plan(tickets);
    return plan.parcels.map((parcel) => this.createCommand(parcel));
  }

  public createCommand(parcel: WorkParcelPlan): AutomationCommand {
    const composedPrompt = this.composePrompt(parcel);
    const metadata = {
      manualControl: parcel.manualControl,
      workerId: parcel.worker.id,
      ticketId: parcel.ticket.id,
      entryUrl: parcel.ticket.entryUrl,
    };
    return { parcel, composedPrompt, metadata };
  }

  private composePrompt(parcel: WorkParcelPlan): string {
    const tuning = parcel.ticket.llmCommand.tuning;
    const instruction = tuning.systemInstruction.trim();
    const styleGuide = tuning.styleGuide.map((line) => `- ${line}`).join('\n');
    const safeguards = tuning.safetyClauses.map((line) => `- ${line}`).join('\n');
    const contextEntries = Object.entries(parcel.ticket.context)
      .map(([key, value]) => `${key}: ${value}`)
      .join('\n');

    const promptSections = [
      `System Instruction:\n${instruction}`,
      styleGuide ? `Style Guide:\n${styleGuide}` : undefined,
      safeguards ? `Safeguards:\n${safeguards}` : undefined,
      contextEntries ? `Context:\n${contextEntries}` : undefined,
      `User Prompt:\n${parcel.ticket.prompt}`,
    ].filter(Boolean);

    return promptSections.join('\n\n');
  }
}
