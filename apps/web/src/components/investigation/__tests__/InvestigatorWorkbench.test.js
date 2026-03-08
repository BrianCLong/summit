"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importDefault(require("react"));
const react_2 = require("@testing-library/react");
const vitest_1 = require("vitest");
const InvestigatorWorkbench_1 = require("../InvestigatorWorkbench");
// Mock GraphCanvas since it uses D3 and specialized DOM APIs
vitest_1.vi.mock('@/graphs/GraphCanvas', () => {
    const React = require('react');
    return {
        GraphCanvas: React.forwardRef(({ entities, onNodeDrop }, ref) => {
            React.useImperativeHandle(ref, () => ({
                exportAsPNG: vitest_1.vi.fn().mockResolvedValue(new Blob()),
                exportAsSVG: vitest_1.vi.fn().mockReturnValue('<svg>...</svg>'),
                exportAsJSON: vitest_1.vi.fn().mockReturnValue('{}')
            }));
            return (<div data-testid="graph-canvas" onDrop={(e) => {
                    // Simulate drop logic
                    const type = 'PERSON'; // Simplified for test
                    onNodeDrop(type, 100, 100);
                }}>
          {entities.map((e) => (<div key={e.id} data-testid={`node-${e.id}`}>{e.name}</div>))}
        </div>);
        })
    };
});
// Mock UI components
vitest_1.vi.mock('@/components/ui/slider', () => ({
    Slider: ({ onValueChange }) => (<input type="range" data-testid="timeline-slider" onChange={(e) => onValueChange([parseInt(e.target.value), 100])}/>)
}));
(0, vitest_1.describe)('InvestigatorWorkbench', () => {
    (0, vitest_1.beforeEach)(() => {
        vitest_1.vi.clearAllMocks();
        // Mock createObjectURL
        global.URL.createObjectURL = vitest_1.vi.fn();
        global.URL.revokeObjectURL = vitest_1.vi.fn();
    });
    (0, vitest_1.it)('renders the workbench correctly', () => {
        (0, react_2.render)(<InvestigatorWorkbench_1.InvestigatorWorkbench />);
        (0, vitest_1.expect)(react_2.screen.getByTestId('investigator-workbench')).toBeDefined();
        (0, vitest_1.expect)(react_2.screen.getByText('Entity Palette')).toBeDefined();
        (0, vitest_1.expect)(react_2.screen.getByText('Timeline Filter')).toBeDefined();
    });
    (0, vitest_1.it)('displays initial entities', () => {
        (0, react_2.render)(<InvestigatorWorkbench_1.InvestigatorWorkbench />);
        (0, vitest_1.expect)(react_2.screen.getByTestId('node-e1')).toBeDefined();
        (0, vitest_1.expect)(react_2.screen.getByTestId('node-e2')).toBeDefined();
    });
    (0, vitest_1.it)('can add new entities via simulation', () => {
        (0, react_2.render)(<InvestigatorWorkbench_1.InvestigatorWorkbench />);
        // In a real test we'd simulate drag and drop events, but here we rely on the mock's simplified behavior
        // or trigger the internal state change if we could access it.
        // However, since we mocked the child component to call onNodeDrop, we can simulate an interaction there?
        // Actually, our mock GraphCanvas renders a div we can interact with.
        const canvas = react_2.screen.getByTestId('graph-canvas');
        react_2.fireEvent.drop(canvas); // This triggers the mock onNodeDrop
        // Check if a new node appeared (our mock renders nodes)
        // The simplified mock logic adds "New PERSON"
        (0, vitest_1.expect)(react_2.screen.getByText('New PERSON')).toBeDefined();
    });
    (0, vitest_1.it)('renders export buttons', () => {
        (0, react_2.render)(<InvestigatorWorkbench_1.InvestigatorWorkbench />);
        (0, vitest_1.expect)(react_2.screen.getByText('Export PNG')).toBeDefined();
        (0, vitest_1.expect)(react_2.screen.getByText('Export SVG')).toBeDefined();
        (0, vitest_1.expect)(react_2.screen.getByText('Export JSON')).toBeDefined();
    });
});
