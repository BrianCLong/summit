"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExplainPanel = void 0;
const react_1 = __importDefault(require("react"));
const store_1 = require("./store");
const ExplainPanel = () => {
    const { timeRange, activeQuery, pinned, clearPinned } = (0, store_1.useAnalysisStore)();
    return (<div data-testid="explain-panel" className="absolute bottom-0 right-0 m-4 p-2 bg-gray-800 text-white text-sm space-y-1">
      <div>
        Time: {timeRange.start} - {timeRange.end}
      </div>
      <div>Query: {activeQuery ?? 'none'}</div>
      <div>Pinned: {pinned.size}</div>
      {pinned.size > 0 && (<div>
          <button onClick={clearPinned} className="mt-1 rounded bg-gray-700 px-2 py-1 text-xs">
            Clear pinned
          </button>
        </div>)}
    </div>);
};
exports.ExplainPanel = ExplainPanel;
exports.default = exports.ExplainPanel;
