"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Grid = void 0;
// @ts-nocheck
const react_1 = __importDefault(require("react"));
const Grid = ({ xScale, yScale, width, height, strokeDasharray = '3,3', }) => {
    return <g className="grid"></g>;
};
exports.Grid = Grid;
exports.default = exports.Grid;
