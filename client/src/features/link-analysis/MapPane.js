"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MapPane = void 0;
const react_1 = __importDefault(require("react"));
const store_1 = require("./store");
// Placeholder for Mapbox GL map
// In a full implementation, mapbox-gl would render a map synchronized with timeRange
const MapPane = () => {
    const timeRange = (0, store_1.useAnalysisStore)((s) => s.timeRange);
    return (<div data-testid="map-pane" className="p-2">
      Map showing data from {timeRange.start} to {timeRange.end}
    </div>);
};
exports.MapPane = MapPane;
exports.default = exports.MapPane;
