"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeProvenance = analyzeProvenance;
function analyzeProvenance(bundle) {
    let missingCreds = 0;
    let totalMedia = 0;
    for (const item of bundle.items || []) {
        if (item.type === 'image' || item.type === 'video') {
            totalMedia++;
            if (!item.metadata?.c2pa) {
                missingCreds++;
            }
        }
    }
    return {
        media_count: totalMedia,
        missing_credentials_count: missingCreds,
        has_missing_credentials: missingCreds > 0
    };
}
