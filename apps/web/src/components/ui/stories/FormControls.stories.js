"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TextAreaField = exports.WithValidation = exports.TextInput = void 0;
const react_1 = __importDefault(require("react"));
const input_1 = require("../input");
const label_1 = require("../label");
const textarea_1 = require("../textarea");
const tokens_1 = require("@/theme/tokens");
const meta = {
    title: 'Design System/Forms/Input',
    component: input_1.Input,
    subcomponents: { Textarea: textarea_1.Textarea },
    parameters: { layout: 'centered' },
};
exports.default = meta;
exports.TextInput = {
    render: () => (<div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: (0, tokens_1.tokenVar)('ds-space-sm'),
            width: 'min(420px, 90vw)',
        }}>
      <label_1.Label htmlFor="search">Search</label_1.Label>
      <input_1.Input id="search" placeholder="Find investigations"/>
    </div>),
};
exports.WithValidation = {
    render: () => (<div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: (0, tokens_1.tokenVar)('ds-space-xs'),
            width: 'min(420px, 90vw)',
        }}>
      <label_1.Label htmlFor="email">Email</label_1.Label>
      <input_1.Input id="email" type="email" placeholder="analyst@intelgraph.ai"/>
      <p className="text-sm text-destructive">
        Please supply a mission-safe email.
      </p>
    </div>),
};
exports.TextAreaField = {
    render: () => (<div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: (0, tokens_1.tokenVar)('ds-space-sm'),
            width: 'min(520px, 90vw)',
        }}>
      <label_1.Label htmlFor="notes">Notes</label_1.Label>
      <textarea_1.Textarea id="notes" minRows={4} placeholder="Capture intel summaries or action items..."/>
    </div>),
};
