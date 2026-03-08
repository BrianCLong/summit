"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProjectionRegistry = exports.InMemoryProjection = void 0;
class InMemoryProjection {
    handler;
    state;
    constructor(initialState, handler) {
        this.handler = handler;
        this.state = {
            state: initialState,
            version: 0,
            updatedAt: new Date().toISOString(),
        };
    }
    get() {
        return this.state;
    }
    apply(envelope) {
        this.state = {
            state: this.handler(this.state.state, envelope),
            version: envelope.version,
            updatedAt: new Date().toISOString(),
        };
    }
}
exports.InMemoryProjection = InMemoryProjection;
class ProjectionRegistry {
    projections = new Map();
    register(id, projection) {
        this.projections.set(id, projection);
    }
    get(id) {
        return this.projections.get(id);
    }
    applyAll(envelope) {
        for (const projection of this.projections.values()) {
            projection.apply(envelope);
        }
    }
}
exports.ProjectionRegistry = ProjectionRegistry;
