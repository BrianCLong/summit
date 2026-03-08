"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importDefault(require("react"));
const react_2 = require("@testing-library/react");
const VirtualizedListTable_1 = __importDefault(require("../VirtualizedListTable"));
const items = Array.from({ length: 40 }, (_, i) => ({
    id: `id-${i}`,
    name: `Row ${i}`,
    status: i % 2 === 0 ? 'open' : 'closed',
}));
const columns = [
    { key: 'name', label: 'Name', width: '2fr', render: (i) => i.name },
    { key: 'status', label: 'Status', width: '1fr', render: (i) => i.status },
];
describe('VirtualizedListTable', () => {
    it('renders only visible rows when virtualization is enabled', () => {
        (0, react_2.render)(<VirtualizedListTable_1.default items={items} columns={columns} height={160} rowHeight={40} virtualizationEnabled overscan={1} ariaLabel="virtualized table"/>);
        expect(react_2.screen.getByText('Row 0')).toBeInTheDocument();
        expect(react_2.screen.queryByText('Row 15')).toBeNull();
    });
    it('renders all rows when virtualization is disabled', () => {
        (0, react_2.render)(<VirtualizedListTable_1.default items={items.slice(0, 5)} columns={columns} height={200} rowHeight={40} virtualizationEnabled={false} ariaLabel="static table"/>);
        expect(react_2.screen.getByText('Row 0')).toBeInTheDocument();
        expect(react_2.screen.getByText('Row 4')).toBeInTheDocument();
    });
});
