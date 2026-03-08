"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseWorkflowExtension = void 0;
class BaseWorkflowExtension {
    id;
    actionName;
    description;
    inputSchema;
    outputSchema;
    type = 'workflow';
    constructor(id, actionName, description, inputSchema, outputSchema) {
        this.id = id;
        this.actionName = actionName;
        this.description = description;
        this.inputSchema = inputSchema;
        this.outputSchema = outputSchema;
    }
}
exports.BaseWorkflowExtension = BaseWorkflowExtension;
