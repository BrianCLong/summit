"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importDefault(require("react"));
const vitest_1 = require("vitest");
const react_2 = require("@testing-library/react");
const InspectorPanel_1 = require("../InspectorPanel");
const viewStore_1 = require("../../store/viewStore");
// Mock types if needed
const mockEntities = [
    { id: '1', name: 'John Doe', type: 'PERSON', confidence: 0.9, properties: {}, createdAt: '', updatedAt: '' },
    { id: '2', name: 'Acme Corp', type: 'ORGANIZATION', confidence: 0.95, properties: {}, createdAt: '', updatedAt: '' }
];
(0, vitest_1.describe)('InspectorPanel', () => {
    (0, vitest_1.it)('renders empty state when nothing selected', () => {
        viewStore_1.useWorkbenchStore.setState({ selectedEntityIds: [] });
        (0, react_2.render)(<InspectorPanel_1.InspectorPanel entities={mockEntities}/>);
        (0, vitest_1.expect)(react_2.screen.getByText('Select an entity to view details')).toBeInTheDocument();
    });
    (0, vitest_1.it)('renders single entity details', () => {
        viewStore_1.useWorkbenchStore.setState({ selectedEntityIds: ['1'] });
        (0, react_2.render)(<InspectorPanel_1.InspectorPanel entities={mockEntities}/>);
        (0, vitest_1.expect)(react_2.screen.getByText('John Doe')).toBeInTheDocument();
        (0, vitest_1.expect)(react_2.screen.getByText('PERSON')).toBeInTheDocument();
    });
    (0, vitest_1.it)('renders multi selection summary', () => {
        viewStore_1.useWorkbenchStore.setState({ selectedEntityIds: ['1', '2'] });
        (0, react_2.render)(<InspectorPanel_1.InspectorPanel entities={mockEntities}/>);
        (0, vitest_1.expect)(react_2.screen.getByText('2 items selected')).toBeInTheDocument();
        (0, vitest_1.expect)(react_2.screen.getByText('PERSON: 1')).toBeInTheDocument();
        (0, vitest_1.expect)(react_2.screen.getByText('ORGANIZATION: 1')).toBeInTheDocument();
    });
});
