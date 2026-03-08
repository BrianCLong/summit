"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useCogGeoApi = useCogGeoApi;
const react_1 = require("react");
function useCogGeoApi() {
    return (0, react_1.useMemo)(() => ({
        getNarratives: async () => [],
        getTerrain: async () => [],
        explain: async (id) => ({
            id,
            summary: "No explanation available yet.",
            drivers: [],
            confidence: 0,
            provenance: { models: [] },
        }),
    }), []);
}
