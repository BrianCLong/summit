"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LayerToggle = LayerToggle;
const react_1 = __importDefault(require("react"));
function LayerToggle(props) {
    const toggle = (layer) => {
        props.onChange({ ...props.enabled, [layer]: !props.enabled[layer] });
    };
    return (<div className="flex items-center gap-2">
      {['reality', 'narrative', 'belief'].map((layer) => (<button key={layer} className={`rounded-full border px-3 py-1 text-xs ${props.enabled[layer] ? 'bg-sand text-midnight' : 'text-sand'}`} onClick={() => toggle(layer)}>
          {layer}
        </button>))}
    </div>);
}
