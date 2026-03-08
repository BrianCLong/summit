"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SpatioTemporalHex = SpatioTemporalHex;
const react_1 = require("@deck.gl/react");
const aggregation_layers_1 = require("@deck.gl/aggregation-layers");
const core_1 = require("@deck.gl/core");
const react_2 = require("react");
function SpatioTemporalHex({ data, window }) {
    const [range, setRange] = (0, react_2.useState)(window);
    const filtered = (0, react_2.useMemo)(() => data.filter((d) => d.ts >= range[0] && d.ts <= range[1]), [data, range]);
    const layer = new aggregation_layers_1.HexagonLayer({
        id: 'signal-hex',
        data: filtered,
        getPosition: (d) => [d.lon, d.lat],
        getElevationWeight: (d) => d.value,
        getColorWeight: (d) => 1 - d.uncertainty,
        colorAggregation: 'MEAN',
        elevationScale: 12,
        extruded: true,
        radius: 500,
        pickable: true,
        onHover: (info) => {
            if (info.object) {
                const { value, uncertainty, sources } = info.object;
                console.log({ value, uncertainty, sources });
            }
        }
    });
    return (<react_1.DeckGL views={new core_1.MapView({ repeat: true })} controller layers={[layer]}/>);
}
