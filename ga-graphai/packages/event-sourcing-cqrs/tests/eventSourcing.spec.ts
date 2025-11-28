import { describe, expect, it } from 'vitest';
import {
  CommandBus,
  EventBus,
  EventReplayer,
  EventualConsistencyCoordinator,
  InMemoryEventStore,
  InMemoryProjection,
  InMemorySnapshotStore,
  SagaOrchestrator,
  type Command,
} from '../src/index.js';

const buildIncrementProjection = () =>
  new InMemoryProjection(0, (state, envelope) => {
    if (envelope.event.type === 'counter-incremented') {
      return state + (envelope.event.payload.amount as number);
    }
    if (envelope.event.type === 'snapshot') {
      return envelope.event.payload as number;
    }
    return state;
  });

describe('event store and command bus', () => {
  it('persists events with optimistic concurrency and publishes them', async () => {
    const eventStore = new InMemoryEventStore();
    const eventBus = new EventBus();
    const snapshotStore = new InMemorySnapshotStore<number>();
    const commandBus = new CommandBus(eventStore, eventBus, snapshotStore);
    const published: string[] = [];

    eventBus.subscribe('counter-incremented', (event) => {
      published.push(event.event.type);
    });

    commandBus.register('increment-counter', (command) => {
      const amount = command.payload.amount as number;
      return {
        events: [{ type: 'counter-incremented', payload: { amount } }],
        snapshot: {
          streamId: command.streamId,
          version: 0,
          state: amount,
          takenAt: new Date().toISOString(),
        },
      };
    });

    const command: Command = {
      type: 'increment-counter',
      streamId: 'counter-1',
      payload: { amount: 2 },
    };

    const envelopes = await commandBus.dispatch(command);
    expect(envelopes).toHaveLength(1);
    expect(envelopes[0].version).toBe(0);
    expect(published).toEqual(['counter-incremented']);

    const snapshot = await snapshotStore.getLatest('counter-1');
    expect(snapshot?.state).toBe(2);

    await expect(() =>
      commandBus.dispatch({ ...command, expectedVersion: 5 }),
    ).rejects.toThrowError(/Optimistic concurrency/);
  });
});

describe('event replay and snapshots', () => {
  it('hydrates projections from snapshots and new events', async () => {
    const eventStore = new InMemoryEventStore();
    const snapshotStore = new InMemorySnapshotStore<number>();
    const projection = buildIncrementProjection();
    const replayer = new EventReplayer(eventStore);

    await snapshotStore.save({
      streamId: 'counter-2',
      version: 1,
      state: 5,
      takenAt: new Date().toISOString(),
    });

    await eventStore.append('counter-2', [
      { type: 'counter-incremented', payload: { amount: 3 } },
      { type: 'counter-incremented', payload: { amount: 2 } },
    ]);

    await replayer.replay({
      streamId: 'counter-2',
      projection,
      snapshotStore,
    });

    expect(projection.get().state).toBe(10);
    expect(projection.get().version).toBe(2);
  });
});

describe('saga orchestration and eventual consistency', () => {
  it('triggers follow-up commands and advances projections with offsets', async () => {
    const eventStore = new InMemoryEventStore();
    const eventBus = new EventBus();
    const commandBus = new CommandBus(eventStore, eventBus);
    const saga = new SagaOrchestrator(eventBus, commandBus);
    const projection = new InMemoryProjection(
      { created: false, reserved: false },
      (state, envelope) => {
        if (envelope.event.type === 'order-created') {
          return { ...state, created: true };
        }
        if (envelope.event.type === 'inventory-reserved') {
          return { ...state, reserved: true };
        }
        return state;
      },
    );
    const coordinator = new EventualConsistencyCoordinator(eventStore);
    coordinator.register('order-read-model', projection);

    commandBus.register('create-order', (command) => ({
      events: [
        { type: 'order-created', payload: { orderId: command.streamId } },
      ],
    }));

    commandBus.register('reserve-inventory', (command) => ({
      events: [
        {
          type: 'inventory-reserved',
          payload: { orderId: command.streamId, items: command.payload.items },
        },
      ],
    }));

    saga.register({
      id: 'order-fulfillment',
      listensTo: ['order-created'],
      initialState: () => ({ hasReservation: false }),
      correlate: (event) => event.streamId,
      handle: (event) => ({
        commands: [
          {
            type: 'reserve-inventory',
            streamId: event.streamId,
            payload: { items: ['sku-1'] },
          },
        ],
        data: { hasReservation: true },
      }),
    });

    await commandBus.dispatch({
      type: 'create-order',
      streamId: 'order-1',
      payload: { items: ['sku-1'] },
    });

    await coordinator.catchUp('order-1');

    expect(projection.get().state).toEqual({ created: true, reserved: true });
  });
});
