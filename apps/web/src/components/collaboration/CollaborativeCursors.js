"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CollaborativeCursors = void 0;
const react_1 = __importDefault(require("react"));
const colors_1 = require("../../lib/utils/colors");
// Optimized with React.memo to prevent unnecessary re-renders of all cursors
// when only one cursor moves. This significantly improves performance when
// multiple users are collaborating.
const Cursor = react_1.default.memo(({ x, y, color = '#f00', label }) => {
    return (<div className="absolute pointer-events-none transition-transform duration-100 ease-linear z-50" style={{
            transform: `translate(${x}px, ${y}px)`,
            top: 0,
            left: 0,
        }}>
      <svg width="24" height="36" viewBox="0 0 24 36" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M5.65376 12.3673H5.46026L5.31717 12.4976L0.500002 16.8829L0.500002 1.19138L11.7841 12.3673H5.65376Z" fill={color} stroke="white"/>
      </svg>
      {label && (<div className="absolute left-4 top-2 px-2 py-1 text-xs text-white rounded whitespace-nowrap" style={{ backgroundColor: color }}>
          {label}
        </div>)}
    </div>);
});
Cursor.displayName = 'Cursor';
const CollaborativeCursors = ({ cursors, containerRef }) => {
    return (<div className="absolute inset-0 pointer-events-none overflow-hidden">
      {cursors.map((cursor) => {
            // If containerRef is provided, we might need to adjust coordinates if they are relative to page
            // But usually we expect x/y to be relative to the container if emitted that way.
            // For now assuming x/y are relative to the container's top-left.
            return (<Cursor key={cursor.userId} x={cursor.x} y={cursor.y} color={(0, colors_1.getStringColor)(cursor.userId)} label={cursor.username || cursor.userId.slice(0, 4)}/>);
        })}
    </div>);
};
exports.CollaborativeCursors = CollaborativeCursors;
