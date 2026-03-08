"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importDefault(require("react"));
const ScenarioSimulator_1 = require("@/components/narrative/ScenarioSimulator");
const SimulationPage = () => {
    return (<div className="h-[calc(100vh-4rem)] overflow-y-auto">
      <ScenarioSimulator_1.ScenarioSimulator />
    </div>);
};
exports.default = SimulationPage;
