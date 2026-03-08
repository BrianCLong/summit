"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importDefault(require("react"));
const vitest_1 = require("vitest");
const react_2 = require("@testing-library/react");
const WorkbenchLayout_1 = require("../WorkbenchLayout");
const viewStore_1 = require("../../store/viewStore");
// Mock sub-components but keep them interactive-ish
vitest_1.vi.mock('../../canvas/LinkAnalysisCanvas', () => ({
    LinkAnalysisCanvas: ({ nodes }) => {
        const { selectEntity } = (0, viewStore_1.useWorkbenchStore)();
        return (<div data-testid="canvas" onClick={() => {
                // Simulate selecting the first node
                if (nodes.length > 0)
                    selectEntity(nodes[0].id);
            }}>
        Canvas with {nodes.length} nodes
        </div>);
    }
}));
vitest_1.vi.mock('../../inspector/InspectorPanel', () => ({
    InspectorPanel: () => {
        const { selectedEntityIds } = (0, viewStore_1.useWorkbenchStore)();
        return (<div data-testid="inspector">
        Inspector: {selectedEntityIds.length} selected
      </div>);
    }
}));
(0, vitest_1.describe)('WorkbenchShell Integration Smoke Test', () => {
    (0, vitest_1.it)('integrates components: selection flows from canvas to inspector', async () => {
        // Reset store
        viewStore_1.useWorkbenchStore.setState({ selectedEntityIds: [] });
        (0, react_2.render)(<WorkbenchLayout_1.WorkbenchShell />);
        // Initial state
        (0, vitest_1.expect)(react_2.screen.getByText('Canvas with 3 nodes')).toBeInTheDocument();
        (0, vitest_1.expect)(react_2.screen.getByText('Inspector: 0 selected')).toBeInTheDocument();
        // Trigger interaction (click canvas to select node 1)
        const canvas = react_2.screen.getByTestId('canvas');
        react_2.fireEvent.click(canvas);
        // Verify state propagation
        // The InspectorPanel mock subscribes to the store, so it should update
        (0, vitest_1.expect)(react_2.screen.getByText('Inspector: 1 selected')).toBeInTheDocument();
    });
});
