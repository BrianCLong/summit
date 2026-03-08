"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LayerToggle = LayerToggle;
const react_1 = __importDefault(require("react"));
function LayerToggle(props) {
    const { enabled, onChange } = props;
    const toggle = (k) => {
        onChange({ ...enabled, [k]: !enabled[k] });
    };
    return (<div className="flex gap-2 items-center">
      {["reality", "narrative", "belief"].map((k) => (<button key={k} className={`px-3 py-1 rounded-2xl border text-sm ${enabled[k] ? "bg-black text-white" : "bg-white"}`} onClick={() => toggle(k)}>
          {k}
        </button>))}
    </div>);
}
