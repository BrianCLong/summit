import type { CommandBus } from './commandBus.js';
import type { EventBus } from './eventBus.js';
import type { Command, EventEnvelope, SagaState } from './types.js';

export interface SagaReaction<TData> {
  commands?: Command[];
  data?: Partial<TData>;
  status?: SagaState['status'];
}

export interface SagaDefinition<TData> {
  id: string;
  listensTo: string[];
  initialState: () => TData;
  correlate: (event: EventEnvelope) => string;
  handle: (event: EventEnvelope, state: SagaState<TData>) => SagaReaction<TData>;
}

export class SagaOrchestrator {
  private readonly state = new Map<string, SagaState<unknown>>();
  private readonly cleanup: (() => void)[] = [];

  constructor(
    private readonly eventBus: EventBus,
    private readonly commandBus?: CommandBus,
  ) {}

  register<TData>(definition: SagaDefinition<TData>): void {
    for (const eventType of definition.listensTo) {
      const unsub = this.eventBus.subscribe(eventType, async (event) => {
        await this.handleEvent(definition, event as EventEnvelope);
      });
      this.cleanup.push(unsub);
    }
  }

  stop(): void {
    for (const unsub of this.cleanup) {
      unsub();
    }
    this.cleanup.length = 0;
  }

  private getSagaState<TData>(definition: SagaDefinition<TData>, key: string): SagaState<TData> {
    const composedKey = `${definition.id}:${key}`;
    const existing = this.state.get(composedKey) as SagaState<TData> | undefined;
    if (existing) {
      return existing;
    }

    const fresh: SagaState<TData> = {
      id: composedKey,
      status: 'pending',
      data: definition.initialState(),
      updatedAt: new Date().toISOString(),
    };
    this.state.set(composedKey, fresh);
    return fresh;
  }

  private async handleEvent<TData>(
    definition: SagaDefinition<TData>,
    event: EventEnvelope,
  ): Promise<void> {
    const correlation = definition.correlate(event);
    const sagaState = this.getSagaState(definition, correlation);

    if (sagaState.lastEventId === event.id) {
      return;
    }

    const reaction = definition.handle(event, sagaState);
    const nextState: SagaState<TData> = {
      ...sagaState,
      lastEventId: event.id,
      data: {
        ...sagaState.data,
        ...(reaction.data ?? {}),
      },
      status: reaction.status ?? sagaState.status,
      updatedAt: new Date().toISOString(),
    };

    this.state.set(nextState.id, nextState);

    if (reaction.commands?.length && this.commandBus) {
      for (const command of reaction.commands) {
        await this.commandBus.dispatch(command);
      }
    }
  }
}
