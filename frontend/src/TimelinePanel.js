"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importDefault(require("react"));
const TimelinePanel = ({ events }) => (<aside className="timeline-panel">
    <h2>Agent Timeline</h2>
    <ul>
      {events.map((e) => (<li key={e.id}>
          <strong>{e.action}</strong> ({e.confidence}) - {e.result}
        </li>))}
    </ul>
  </aside>);
exports.default = TimelinePanel;
