"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseAutomationExtension = void 0;
class BaseAutomationExtension {
    id;
    triggerId;
    requiredScopes;
    type = 'automation';
    constructor(id, triggerId, requiredScopes = []) {
        this.id = id;
        this.triggerId = triggerId;
        this.requiredScopes = requiredScopes;
    }
}
exports.BaseAutomationExtension = BaseAutomationExtension;
