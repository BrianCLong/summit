"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SagaOrchestrator = void 0;
class SagaOrchestrator {
    eventBus;
    commandBus;
    state = new Map();
    cleanup = [];
    constructor(eventBus, commandBus) {
        this.eventBus = eventBus;
        this.commandBus = commandBus;
    }
    register(definition) {
        for (const eventType of definition.listensTo) {
            const unsub = this.eventBus.subscribe(eventType, async (event) => {
                await this.handleEvent(definition, event);
            });
            this.cleanup.push(unsub);
        }
    }
    stop() {
        for (const unsub of this.cleanup) {
            unsub();
        }
        this.cleanup.length = 0;
    }
    getSagaState(definition, key) {
        const composedKey = `${definition.id}:${key}`;
        const existing = this.state.get(composedKey);
        if (existing) {
            return existing;
        }
        const fresh = {
            id: composedKey,
            status: 'pending',
            data: definition.initialState(),
            updatedAt: new Date().toISOString(),
        };
        this.state.set(composedKey, fresh);
        return fresh;
    }
    async handleEvent(definition, event) {
        const correlation = definition.correlate(event);
        const sagaState = this.getSagaState(definition, correlation);
        if (sagaState.lastEventId === event.id) {
            return;
        }
        const reaction = definition.handle(event, sagaState);
        const nextState = {
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
exports.SagaOrchestrator = SagaOrchestrator;
