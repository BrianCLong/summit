"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseActionExtension = void 0;
class BaseActionExtension {
    id;
    actionId;
    inputSchema;
    outputSchema;
    requiredScopes;
    type = 'action';
    constructor(id, actionId, inputSchema, outputSchema = {}, requiredScopes = []) {
        this.id = id;
        this.actionId = actionId;
        this.inputSchema = inputSchema;
        this.outputSchema = outputSchema;
        this.requiredScopes = requiredScopes;
    }
}
exports.BaseActionExtension = BaseActionExtension;
