"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CodexPanel = CodexPanel;
const react_1 = __importDefault(require("react"));
const codexSlice_1 = require("./codexSlice");
const hooks_1 = require("../../store/hooks");
// @ts-ignore
const core_1 = require("@dnd-kit/core");
function CodexPanel() {
    const codex = (0, hooks_1.useAppSelector)(codexSlice_1.selectCodex);
    const dispatch = (0, hooks_1.useAppDispatch)();
    return (<aside aria-label="Codex" className="codex-panel">
      <header>
        <h2>Codex</h2>
        <button onClick={() => dispatch((0, codexSlice_1.addSection)('New Section'))}>
          + Section
        </button>
      </header>
      <core_1.DndContext collisionDetection={core_1.closestCenter} onDragEnd={() => {
            /* dispatch moveCard */
        }}>
        {/* render sections & cards */}
      </core_1.DndContext>
    </aside>);
}
exports.default = CodexPanel;
