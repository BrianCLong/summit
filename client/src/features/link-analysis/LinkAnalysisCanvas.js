"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LinkAnalysisCanvas = void 0;
const react_1 = __importDefault(require("react"));
const TimelinePane_1 = __importDefault(require("./TimelinePane"));
const MapPane_1 = __importDefault(require("./MapPane"));
const GraphPane_1 = __importDefault(require("./GraphPane"));
const CommandPalette_1 = __importDefault(require("./CommandPalette"));
const ExplainPanel_1 = __importDefault(require("./ExplainPanel"));
const LinkAnalysisCanvas = () => {
    return (<div className="relative grid grid-cols-3 h-screen divide-x" data-testid="link-analysis-canvas">
      <TimelinePane_1.default />
      <MapPane_1.default />
      <GraphPane_1.default />
      <CommandPalette_1.default />
      <ExplainPanel_1.default />
    </div>);
};
exports.LinkAnalysisCanvas = LinkAnalysisCanvas;
exports.default = exports.LinkAnalysisCanvas;
