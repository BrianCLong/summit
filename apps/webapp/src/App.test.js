"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = require("@testing-library/react");
const App_1 = require("./App");
const store_1 = require("./store");
const vitest_1 = require("vitest");
vitest_1.vi.mock('cytoscape', () => ({
    default: () => ({
        on: () => { },
        container: () => document.createElement('div'),
        remove: () => { },
    }),
}));
vitest_1.vi.mock('vis-timeline/standalone', () => ({
    DataSet: class {
        add() { }
    },
    Timeline: class {
        on() { }
        getWindow() {
            return { start: new Date(), end: new Date() };
        }
        setSelection() { }
        destroy() { }
        dom = { center: document.createElement('div') };
    },
}));
vitest_1.vi.mock('mapbox-gl', () => ({
    default: {
        Map: class {
            flyTo() { }
            remove() { }
        },
        Marker: class {
            setLngLat() {
                return this;
            }
            addTo() {
                return this;
            }
        },
        accessToken: '',
    },
}));
test('renders panes', () => {
    (0, react_1.render)(<App_1.App />);
    expect(react_1.screen.getByLabelText('toggle theme')).toBeInTheDocument();
});
test('selection updates store', () => {
    store_1.store.dispatch((0, store_1.selectNode)('a'));
    expect(store_1.store.getState().selection.selectedNodeId).toBe('a');
});
