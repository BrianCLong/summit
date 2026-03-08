"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.executeQAWorkflow = executeQAWorkflow;
function executeQAWorkflow(query, context) {
    return `Answering ${query} with context size ${context.length}`;
}
