import { TripletPersister, TripletState } from '../types.js';

export class InMemoryTripletPersister implements TripletPersister {
  private readonly store = new Map<string, TripletState>();

  async persist(state: TripletState): Promise<void> {
    this.store.set(state.id, state);
  }

  async load(tripletId: string): Promise<TripletState | undefined> {
    return this.store.get(tripletId);
  }

  entries(): TripletState[] {
    return [...this.store.values()];
  }
}
