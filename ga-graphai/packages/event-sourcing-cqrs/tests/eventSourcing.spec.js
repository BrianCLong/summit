"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const index_js_1 = require("../src/index.js");
const buildIncrementProjection = () => new index_js_1.InMemoryProjection(0, (state, envelope) => {
    if (envelope.event.type === 'counter-incremented') {
        return state + envelope.event.payload.amount;
    }
    if (envelope.event.type === 'snapshot') {
        return envelope.event.payload;
    }
    return state;
});
(0, vitest_1.describe)('event store and command bus', () => {
    (0, vitest_1.it)('persists events with optimistic concurrency and publishes them', async () => {
        const eventStore = new index_js_1.InMemoryEventStore();
        const eventBus = new index_js_1.EventBus();
        const snapshotStore = new index_js_1.InMemorySnapshotStore();
        const commandBus = new index_js_1.CommandBus(eventStore, eventBus, snapshotStore);
        const published = [];
        eventBus.subscribe('counter-incremented', (event) => {
            published.push(event.event.type);
        });
        commandBus.register('increment-counter', (command) => {
            const amount = command.payload.amount;
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
        const command = {
            type: 'increment-counter',
            streamId: 'counter-1',
            payload: { amount: 2 },
        };
        const envelopes = await commandBus.dispatch(command);
        (0, vitest_1.expect)(envelopes).toHaveLength(1);
        (0, vitest_1.expect)(envelopes[0].version).toBe(0);
        (0, vitest_1.expect)(published).toEqual(['counter-incremented']);
        const snapshot = await snapshotStore.getLatest('counter-1');
        (0, vitest_1.expect)(snapshot?.state).toBe(2);
        await (0, vitest_1.expect)(() => commandBus.dispatch({ ...command, expectedVersion: 5 })).rejects.toThrowError(/Optimistic concurrency/);
    });
});
(0, vitest_1.describe)('event replay and snapshots', () => {
    (0, vitest_1.it)('hydrates projections from snapshots and new events', async () => {
        const eventStore = new index_js_1.InMemoryEventStore();
        const snapshotStore = new index_js_1.InMemorySnapshotStore();
        const projection = buildIncrementProjection();
        const replayer = new index_js_1.EventReplayer(eventStore);
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
        (0, vitest_1.expect)(projection.get().state).toBe(10);
        (0, vitest_1.expect)(projection.get().version).toBe(2);
    });
});
(0, vitest_1.describe)('saga orchestration and eventual consistency', () => {
    (0, vitest_1.it)('triggers follow-up commands and advances projections with offsets', async () => {
        const eventStore = new index_js_1.InMemoryEventStore();
        const eventBus = new index_js_1.EventBus();
        const commandBus = new index_js_1.CommandBus(eventStore, eventBus);
        const saga = new index_js_1.SagaOrchestrator(eventBus, commandBus);
        const projection = new index_js_1.InMemoryProjection({ created: false, reserved: false }, (state, envelope) => {
            if (envelope.event.type === 'order-created') {
                return { ...state, created: true };
            }
            if (envelope.event.type === 'inventory-reserved') {
                return { ...state, reserved: true };
            }
            return state;
        });
        const coordinator = new index_js_1.EventualConsistencyCoordinator(eventStore);
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
        (0, vitest_1.expect)(projection.get().state).toEqual({ created: true, reserved: true });
    });
});
