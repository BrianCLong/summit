"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importDefault(require("react"));
const material_1 = require("@mui/material");
const FacetsPanel = ({ facets }) => (<material_1.Box>
    <material_1.Typography variant="h6" gutterBottom>
      Facets
    </material_1.Typography>
    {Object.entries(facets).map(([key, values]) => (<material_1.Box key={key} mb={1}>
        <material_1.Typography variant="subtitle2">{key}</material_1.Typography>
        <material_1.Typography variant="body2">{values.join(', ')}</material_1.Typography>
      </material_1.Box>))}
  </material_1.Box>);
exports.default = FacetsPanel;
