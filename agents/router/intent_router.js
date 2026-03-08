"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.routeIntent = routeIntent;
exports.validateAction = validateAction;
function routeIntent(query) {
    if (query.toLowerCase().includes('summarize'))
        return 'summarize';
    if (query.toLowerCase().includes('draft'))
        return 'draft';
    if (query.toLowerCase().includes('execute') || query.toLowerCase().includes('run'))
        return 'execute';
    return 'qa';
}
function validateAction(intent, allowedTools) {
    // deny-by-default logic based on intent
    if (intent === 'execute' && !allowedTools.includes('execute_command'))
        return false;
    return true;
}
