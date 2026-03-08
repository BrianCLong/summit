"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ChainOfCustody;
const react_1 = __importDefault(require("react"));
const material_1 = require("@mui/material");
function ChainOfCustody({ entries = [], }) {
    return (<material_1.List dense aria-label="Chain of custody">
      {entries.map((e, i) => (<material_1.ListItem key={i} divider>
          <material_1.ListItemText primary={`${e.actor} — ${e.action}`} secondary={new Date(e.at).toLocaleString()}/>
        </material_1.ListItem>))}
    </material_1.List>);
}
