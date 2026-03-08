"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Axis = void 0;
// @ts-nocheck
const react_1 = __importDefault(require("react"));
const Axis = ({ orientation, scale, tickFormat, tickCount, }) => {
    return <g className={`axis axis-${orientation}`}></g>;
};
exports.Axis = Axis;
exports.default = exports.Axis;
