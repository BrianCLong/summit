"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CognitiveWeatherRadarPage = CognitiveWeatherRadarPage;
const react_1 = require("react");
const ExplainDrawer_1 = require("./components/ExplainDrawer");
const LayerToggles_1 = require("./components/LayerToggles");
const MapView_1 = require("./components/MapView");
const NarrativePicker_1 = require("./components/NarrativePicker");
const useCogGeoApi_1 = require("./hooks/useCogGeoApi");
const DEFAULT_LAYERS = {
    pressure: true,
    temperature: true,
    storms: true,
    winds: false,
};
function CognitiveWeatherRadarPage() {
    const api = (0, useCogGeoApi_1.useCogGeoApi)();
    const [layers, setLayers] = (0, react_1.useState)(DEFAULT_LAYERS);
    const [narratives, setNarratives] = (0, react_1.useState)([]);
    const [cells, setCells] = (0, react_1.useState)([]);
    const [selectedNarrativeId, setSelectedNarrativeId] = (0, react_1.useState)(null);
    const [explainPayload, setExplainPayload] = (0, react_1.useState)(null);
    (0, react_1.useEffect)(() => {
        void api.getNarratives().then(setNarratives);
        void api.getTerrain().then(setCells);
    }, [api]);
    (0, react_1.useEffect)(() => {
        if (!selectedNarrativeId) {
            setExplainPayload(null);
            return;
        }
        void api.explain(selectedNarrativeId).then(setExplainPayload);
    }, [api, selectedNarrativeId]);
    const toggleLayer = (layer) => {
        setLayers((prev) => ({ ...prev, [layer]: !prev[layer] }));
    };
    return (<main>
      <h2>Summit Cognitive Weather Radar</h2>
      <LayerToggles_1.LayerToggles layers={layers} onToggle={toggleLayer}/>
      <NarrativePicker_1.NarrativePicker narratives={narratives} selected={selectedNarrativeId} onSelect={setSelectedNarrativeId}/>
      <MapView_1.MapView cells={cells}/>
      <ExplainDrawer_1.ExplainDrawer payload={explainPayload}/>
    </main>);
}
