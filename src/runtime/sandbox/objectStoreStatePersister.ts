import type { IObjectStore, RunSpec, RuntimeState } from "./types.js";

function stateKey(namespace: string): string {
  return `${namespace}/runtime-state.json`;
}

export class ObjectStoreStatePersister {
  constructor(private readonly objectStore: IObjectStore) {}

  async load(spec: RunSpec): Promise<RuntimeState> {
    if (!spec.persistence.enabled) {
      return { completedSteps: 0, lastTools: [] };
    }

    const serialized = await this.objectStore.get(stateKey(spec.persistence.namespace));
    if (!serialized) {
      return { completedSteps: 0, lastTools: [] };
    }

    const parsed = JSON.parse(serialized) as RuntimeState;
    return parsed;
  }

  async save(spec: RunSpec, state: RuntimeState): Promise<void> {
    if (!spec.persistence.enabled) {
      return;
    }

    await this.objectStore.put(
      stateKey(spec.persistence.namespace),
      JSON.stringify(state),
      spec.persistence.ttlSeconds
    );
  }
}
