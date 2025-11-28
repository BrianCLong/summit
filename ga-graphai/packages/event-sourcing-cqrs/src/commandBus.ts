import type { SnapshotStore } from './snapshotStore.js';
import type { EventStore } from './eventStore.js';
import { ConcurrencyError } from './eventStore.js';
import type { Command, DomainEvent, EventEnvelope, Snapshot } from './types.js';
import { EventBus } from './eventBus.js';

export interface CommandHandlerContext {
  history: EventEnvelope[];
  snapshot?: Snapshot;
}

export type CommandHandler = (
  command: Command,
  context: CommandHandlerContext,
) => Promise<CommandHandlerResult> | CommandHandlerResult;

export interface CommandHandlerResult {
  events: DomainEvent[];
  snapshot?: Snapshot;
}

export class CommandBus {
  private readonly handlers = new Map<string, CommandHandler>();

  constructor(
    private readonly eventStore: EventStore,
    private readonly eventBus: EventBus,
    private readonly snapshotStore?: SnapshotStore,
  ) {}

  register(commandType: string, handler: CommandHandler): void {
    this.handlers.set(commandType, handler);
  }

  async dispatch(command: Command): Promise<EventEnvelope[]> {
    const handler = this.handlers.get(command.type);
    if (!handler) {
      throw new Error(`No handler registered for ${command.type}`);
    }

    const history = await this.eventStore.loadStream(command.streamId);
    const snapshot = this.snapshotStore
      ? await this.snapshotStore.getLatest(command.streamId)
      : undefined;

    const result = await handler(command, { history, snapshot });
    if (!result.events.length) {
      return [];
    }

    const lastVersion = history.at(-1)?.version ?? -1;
    const expectedVersion = command.expectedVersion ?? lastVersion;
    if (expectedVersion !== lastVersion) {
      throw new ConcurrencyError(
        `Optimistic concurrency check failed for ${command.streamId}`,
      );
    }

    const envelopes = await this.eventStore.append(
      command.streamId,
      result.events,
      expectedVersion,
    );

    if (result.snapshot && this.snapshotStore) {
      const finalVersion = envelopes.at(-1)?.version ?? lastVersion;
      await this.snapshotStore.save({
        ...result.snapshot,
        streamId: command.streamId,
        version: finalVersion,
        takenAt: result.snapshot.takenAt ?? new Date().toISOString(),
      });
    }

    await this.eventBus.publish(envelopes);
    return envelopes;
  }
}
