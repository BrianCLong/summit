"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = require("@testing-library/react");
const CommandPalette_1 = require("./CommandPalette");
const react_redux_1 = require("react-redux");
const toolkit_1 = require("@reduxjs/toolkit");
const vitest_1 = require("vitest");
// Mock store setup
const createMockStore = (initialState) => (0, toolkit_1.configureStore)({
    reducer: {
        selection: (state = initialState, action) => {
            if (action.type === 'selection/selectNode')
                return { ...state, selectedNodeId: action.payload };
            if (action.type === 'selection/setTimeRange')
                return { ...state, timeRange: action.payload };
            return state;
        }
    }
});
describe('CommandPalette', () => {
    const toggleTheme = vitest_1.vi.fn();
    const onClose = vitest_1.vi.fn();
    it('renders commands correctly', () => {
        const store = createMockStore({ selectedNodeId: 'node-1', timeRange: [100, 200] });
        (0, react_1.render)(<react_redux_1.Provider store={store}>
        <CommandPalette_1.CommandPalette open={true} onClose={onClose} toggleTheme={toggleTheme} mode="light"/>
      </react_redux_1.Provider>);
        expect(react_1.screen.getByText('Switch to Dark Mode')).toBeInTheDocument();
        expect(react_1.screen.getByText('Clear Node Selection')).toBeInTheDocument();
        expect(react_1.screen.getByText('Reset Time Range')).toBeInTheDocument();
    });
    it('calls toggleTheme when clicked', () => {
        const store = createMockStore({ selectedNodeId: null, timeRange: null });
        (0, react_1.render)(<react_redux_1.Provider store={store}>
        <CommandPalette_1.CommandPalette open={true} onClose={onClose} toggleTheme={toggleTheme} mode="light"/>
      </react_redux_1.Provider>);
        react_1.fireEvent.click(react_1.screen.getByText('Switch to Dark Mode'));
        expect(toggleTheme).toHaveBeenCalled();
        expect(onClose).toHaveBeenCalled();
    });
    it('shows Switch to Light Mode when mode is dark', () => {
        const store = createMockStore({ selectedNodeId: null, timeRange: null });
        (0, react_1.render)(<react_redux_1.Provider store={store}>
        <CommandPalette_1.CommandPalette open={true} onClose={onClose} toggleTheme={toggleTheme} mode="dark"/>
      </react_redux_1.Provider>);
        expect(react_1.screen.getByText('Switch to Light Mode')).toBeInTheDocument();
    });
});
