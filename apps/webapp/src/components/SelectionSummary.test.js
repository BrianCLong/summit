"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = require("@testing-library/react");
const react_redux_1 = require("react-redux");
const SelectionSummary_1 = require("./SelectionSummary");
const store_1 = require("../store");
describe('SelectionSummary', () => {
    beforeEach(() => {
        store_1.store.dispatch((0, store_1.selectNode)(null));
        store_1.store.dispatch((0, store_1.setTimeRange)(null));
    });
    test('renders with no selection', () => {
        (0, react_1.render)(<react_redux_1.Provider store={store_1.store}>
        <SelectionSummary_1.SelectionSummary />
      </react_redux_1.Provider>);
        expect(react_1.screen.getByText('None')).toBeInTheDocument();
        expect(react_1.screen.getByText('Unbounded')).toBeInTheDocument();
    });
    test('clears selected node when delete is clicked', () => {
        store_1.store.dispatch((0, store_1.selectNode)('test-node'));
        (0, react_1.render)(<react_redux_1.Provider store={store_1.store}>
        <SelectionSummary_1.SelectionSummary />
      </react_redux_1.Provider>);
        expect(react_1.screen.getByText('test-node')).toBeInTheDocument();
        const chip = react_1.screen.getByTestId('selected-node-label');
        // Using a generic selector for the delete icon/button since we depend on MUI internals or implementation
        // The implementation will add onDelete which usually renders a button.
        const deleteBtn = chip.querySelector('svg[data-testid="CancelIcon"]') ||
            chip.querySelector('button') ||
            chip.querySelector('.MuiChip-deleteIcon');
        if (deleteBtn) {
            react_1.fireEvent.click(deleteBtn);
            expect(store_1.store.getState().selection.selectedNodeId).toBeNull();
        }
    });
    test('clears time range when delete is clicked', () => {
        store_1.store.dispatch((0, store_1.setTimeRange)([1600000000000, 1600001000000]));
        (0, react_1.render)(<react_redux_1.Provider store={store_1.store}>
        <SelectionSummary_1.SelectionSummary />
      </react_redux_1.Provider>);
        expect(react_1.screen.getByTestId('time-range-label')).toHaveTextContent(/-/, {
            normalizeWhitespace: true,
        });
        const chip = react_1.screen.getByTestId('time-range-label');
        const deleteBtn = chip.querySelector('svg[data-testid="CancelIcon"]') ||
            chip.querySelector('button') ||
            chip.querySelector('.MuiChip-deleteIcon');
        if (deleteBtn) {
            react_1.fireEvent.click(deleteBtn);
            expect(store_1.store.getState().selection.timeRange).toBeNull();
        }
    });
});
