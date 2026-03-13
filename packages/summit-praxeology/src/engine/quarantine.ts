export class InMemoryPGQuarantine {
  private actions: Map<string, any> = new Map();
  private playbooks: Map<string, any> = new Map();
  private hypotheses: Map<string, any> = new Map();

  upsertAction(id: string, payload: any) {
    this.actions.set(id, payload);
  }

  upsertPlaybook(id: string, payload: any) {
    this.playbooks.set(id, payload);
  }

  upsertHypothesis(id: string, payload: any) {
    this.hypotheses.set(id, payload);
  }

  getAction(id: string) { return this.actions.get(id); }
  getPlaybook(id: string) { return this.playbooks.get(id); }
  getHypothesis(id: string) { return this.hypotheses.get(id); }
}
