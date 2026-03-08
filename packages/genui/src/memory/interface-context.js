"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InterfaceContext = void 0;
class InterfaceContext {
    interfaces = new Map();
    save(sessionId, ui) {
        this.interfaces.set(sessionId, ui);
    }
    get(sessionId) {
        return this.interfaces.get(sessionId);
    }
}
exports.InterfaceContext = InterfaceContext;
