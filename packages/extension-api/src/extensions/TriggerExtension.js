"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseTriggerExtension = void 0;
class BaseTriggerExtension {
    id;
    triggerType;
    eventSchema;
    requiredScopes;
    type = 'trigger';
    constructor(id, triggerType, eventSchema, requiredScopes = []) {
        this.id = id;
        this.triggerType = triggerType;
        this.eventSchema = eventSchema;
        this.requiredScopes = requiredScopes;
    }
}
exports.BaseTriggerExtension = BaseTriggerExtension;
