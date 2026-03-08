"use strict";
'use client';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ActionsPanel;
const react_1 = __importDefault(require("react"));
const material_1 = require("@mui/material");
const icons_material_1 = require("@mui/icons-material");
function ActionsPanel({ onOpenCommandPalette }) {
    return (<material_1.Box>
        <material_1.Button variant="contained" className="w-full" onClick={onOpenCommandPalette} startIcon={<icons_material_1.RocketLaunch />}>
          Open Command Palette (⌘K)
        </material_1.Button>
    </material_1.Box>);
}
