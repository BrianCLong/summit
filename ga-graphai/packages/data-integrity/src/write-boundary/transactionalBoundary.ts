export interface IntentRecord {
  id: string;
  scope: string;
  createdAt: number;
  completed?: boolean;
}

export interface IntentStore {
  saveIntent(intent: IntentRecord): Promise<void>;
  completeIntent(id: string): Promise<void>;
  listPending(before: number): Promise<IntentRecord[]>;
}

export class InMemoryIntentStore implements IntentStore {
  private intents = new Map<string, IntentRecord>();

  async saveIntent(intent: IntentRecord): Promise<void> {
    this.intents.set(intent.id, intent);
  }

  async completeIntent(id: string): Promise<void> {
    const intent = this.intents.get(id);
    if (intent) {
      intent.completed = true;
      this.intents.set(id, intent);
    }
  }

  async listPending(before: number): Promise<IntentRecord[]> {
    return Array.from(this.intents.values()).filter(
      (intent) => !intent.completed && intent.createdAt <= before
    );
  }
}

export interface TransactionAdapter {
  begin(): Promise<void>;
  commit(): Promise<void>;
  rollback(): Promise<void>;
}

export class TransactionalBoundary {
  constructor(
    private readonly adapter: TransactionAdapter,
    private readonly intents: IntentStore
  ) {}

  async execute<T>(
    options: { id: string; scope: string; ttlMs: number },
    work: () => Promise<T>
  ): Promise<T> {
    await this.adapter.begin();
    await this.intents.saveIntent({
      id: options.id,
      scope: options.scope,
      createdAt: Date.now(),
    });
    try {
      const result = await work();
      await this.adapter.commit();
      await this.intents.completeIntent(options.id);
      return result;
    } catch (error) {
      await this.adapter.rollback();
      throw error;
    }
  }
}

export class PartialWriteDetector {
  constructor(private readonly intents: IntentStore) {}

  async detect(now: number): Promise<IntentRecord[]> {
    return this.intents.listPending(now);
  }
}
