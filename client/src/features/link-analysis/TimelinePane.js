"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TimelinePane = void 0;
const react_1 = __importDefault(require("react"));
const store_1 = require("./store");
const TimelinePane = () => {
    const timeRange = (0, store_1.useAnalysisStore)((s) => s.timeRange);
    const setTimeRange = (0, store_1.useAnalysisStore)((s) => s.setTimeRange);
    return (<div data-testid="timeline-pane" className="p-2 space-y-2">
      <input data-testid="start-range" type="range" min={0} max={100} value={timeRange.start} onChange={(e) => setTimeRange({ ...timeRange, start: Number(e.target.value) })}/>
      <input data-testid="end-range" type="range" min={0} max={100} value={timeRange.end} onChange={(e) => setTimeRange({ ...timeRange, end: Number(e.target.value) })}/>
    </div>);
};
exports.TimelinePane = TimelinePane;
exports.default = exports.TimelinePane;
