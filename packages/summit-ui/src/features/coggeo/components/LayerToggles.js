"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LayerToggles = void 0;
const LayerToggles = ({ layers, onToggle }) => (<div>
    {Object.entries(layers).map(([layer, enabled]) => (<label key={layer} style={{ display: "block" }}>
        <input type="checkbox" checked={enabled} onChange={() => onToggle(layer)}/>
        {layer}
      </label>))}
  </div>);
exports.LayerToggles = LayerToggles;
