"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = OsintHealth;
const react_1 = __importDefault(require("react"));
const material_1 = require("@mui/material");
function OsintHealth() {
    return (<material_1.Box sx={{ p: 3 }}>
            <material_1.Typography variant="h5">OSINT Health Operations</material_1.Typography>
            <material_1.Typography color="text.secondary">System health monitoring and diagnostics.</material_1.Typography>
        </material_1.Box>);
}
