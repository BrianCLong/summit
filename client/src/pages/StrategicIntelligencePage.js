"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importDefault(require("react"));
const StrategicIntelligenceDashboard_1 = __importDefault(require("../components/StrategicIntelligenceDashboard"));
const StrategicIntelligencePage = () => {
    return (<div className="strategic-intelligence-page">
      <StrategicIntelligenceDashboard_1.default />
    </div>);
};
exports.default = StrategicIntelligencePage;
