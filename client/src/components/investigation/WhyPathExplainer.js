"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importDefault(require("react"));
const ExplainabilityPanel_1 = __importDefault(require("../../ui/components/ExplainabilityPanel"));
const WhyPathExplainer = ({ paths }) => (<ExplainabilityPanel_1.default paths={paths}/>);
exports.default = WhyPathExplainer;
