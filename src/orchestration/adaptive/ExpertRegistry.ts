export type Expert = {
  id: string;
  description: string;
  capabilities: string[];
  handle: (input: string, ctx: SessionContext) => Promise<string>;
};

export type SessionContext = {
  sessionId: string;
  summary: string;
  metadata: Record<string, unknown>;
};

export class ExpertRegistry {
  private readonly experts = new Map<string, Expert>();

  register(expert: Expert): void {
    this.experts.set(expert.id, expert);
  }

  all(): Expert[] {
    return Array.from(this.experts.values());
  }

  get(id: string): Expert | undefined {
    return this.experts.get(id);
  }
}
