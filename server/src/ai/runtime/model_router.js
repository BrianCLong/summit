"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.routeModelTier = routeModelTier;
function routeModelTier(intent, complexity) {
    // Cheap-by-default for drafting or summarizing short texts
    if (intent === 'summarize' && complexity < 1000)
        return 'cheap';
    if (intent === 'draft' && complexity < 2000)
        return 'cheap';
    if (intent === 'execute' || complexity > 5000)
        return 'premium';
    return 'standard';
}
