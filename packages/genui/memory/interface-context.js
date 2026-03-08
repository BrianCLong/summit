"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InterfaceContext = void 0;
class InterfaceContext {
    state = new Map();
    save(sessionId, interfaceData) {
        this.state.set(sessionId, interfaceData);
    }
    load(sessionId) {
        return this.state.get(sessionId);
    }
}
exports.InterfaceContext = InterfaceContext;
