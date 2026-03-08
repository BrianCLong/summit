"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Toggles = void 0;
const react_1 = __importDefault(require("react"));
const label_1 = require("../label");
const slider_1 = require("../slider");
const switch_1 = require("../switch");
const tokens_1 = require("@/theme/tokens");
const meta = {
    title: 'Design System/Inputs/Switch & Slider',
    component: switch_1.Switch,
};
exports.default = meta;
exports.Toggles = {
    render: () => (<div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: (0, tokens_1.tokenVar)('ds-space-md'),
        }}>
      <label className="flex items-center gap-2 text-sm">
        <switch_1.Switch defaultChecked id="feature"/>
        <span>Enable mission briefings</span>
      </label>
      <div className="space-y-2">
        <label_1.Label htmlFor="risk">Risk threshold</label_1.Label>
        <slider_1.Slider id="risk" defaultValue={[60]} min={0} max={100} step={10}/>
      </div>
    </div>),
};
