"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TimelineReplay = void 0;
const react_1 = __importDefault(require("react"));
const TimelineReplay = ({ events }) => {
    return (<div className="intelgraph-timeline border p-4">
      <h3>Timeline Replay</h3>
      {events.length === 0 ? (<p className="text-gray-500">No events to replay.</p>) : (<ul className="list-disc pl-5">
          {events.map((evt, idx) => (<li key={idx}>
              <span className="font-mono text-sm text-gray-600">{evt.timestamp}</span>: {evt.label}
            </li>))}
        </ul>)}
    </div>);
};
exports.TimelineReplay = TimelineReplay;
