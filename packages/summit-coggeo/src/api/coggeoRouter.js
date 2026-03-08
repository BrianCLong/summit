"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCogGeoQueryService = createCogGeoQueryService;
const explain_1 = require("../ui-contract/explain");
function createCogGeoQueryService() {
    return {
        listNarratives: async () => [],
        listTerrainCells: async () => [],
        explain: async (id) => (0, explain_1.buildExplainPayload)(id),
    };
}
