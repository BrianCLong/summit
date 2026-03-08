"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bellingcatSeedRecords = void 0;
exports.bellingcatSeedRecords = [
    {
        tool_id: 'invid',
        name: 'InVID',
        source: 'bellingcat',
        homepage: 'https://www.invid-project.eu/',
        toolkit_page: 'https://bellingcat.gitbook.io/toolkit/more/all-tools/invid',
        categories: ['Image & video verification'],
        availability: { type: 'web', auth_required: false, cost: 'free' },
        risk: { data_sensitivity: 'medium', tos_risk: 'low', pii_risk: 'medium' },
        limitations: ['May require manual interpretation; false positives possible'],
        evidence: { claim_ids: ['ITEM:CLAIM-10'] },
    },
];
