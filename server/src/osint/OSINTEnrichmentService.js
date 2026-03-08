"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OSINTEnrichmentService = void 0;
const SocialMediaConnector_js_1 = require("./connectors/SocialMediaConnector.js");
const CorporateDBConnector_js_1 = require("./connectors/CorporateDBConnector.js");
const PublicRecordConnector_js_1 = require("./connectors/PublicRecordConnector.js");
class OSINTEnrichmentService {
    connectors;
    constructor() {
        this.connectors = [
            new SocialMediaConnector_js_1.SocialMediaConnector(),
            new CorporateDBConnector_js_1.CorporateDBConnector(),
            new PublicRecordConnector_js_1.PublicRecordConnector()
        ];
    }
    async enrich(query) {
        const promises = this.connectors.map(c => c.search(query));
        const resultsSettled = await Promise.allSettled(promises);
        const results = resultsSettled
            .filter(r => r.status === 'fulfilled')
            .map(r => r.value)
            .flat();
        if (resultsSettled.some(r => r.status === 'rejected')) {
            // Log errors in real implementation
            // console.error('Some connectors failed', resultsSettled.filter(r => r.status === 'rejected'));
        }
        // Aggregate results into a partial profile
        const profile = {
            socialProfiles: [],
            corporateRecords: [],
            publicRecords: [],
            properties: {},
            externalRefs: [],
            labels: ['osint-enriched']
        };
        for (const res of results) {
            if (res.data) {
                // Simple type checking based on properties
                if ('platform' in res.data) {
                    profile.socialProfiles.push(res.data);
                }
                else if ('incorporationDate' in res.data) {
                    profile.corporateRecords.push(res.data);
                }
                else if ('recordType' in res.data) {
                    profile.publicRecords.push(res.data);
                }
            }
        }
        // Calculate a confidence score based on number of sources found
        const sourceCount = new Set(results.map(r => r.source)).size;
        profile.confidenceScore = Math.min(0.5 + (sourceCount * 0.1), 1.0); // Base 0.5 + 0.1 per unique source
        return {
            ...profile,
            results, // Include raw results for claim extraction (Turn #5)
        };
    }
}
exports.OSINTEnrichmentService = OSINTEnrichmentService;
