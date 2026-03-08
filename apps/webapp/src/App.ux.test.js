"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = require("@testing-library/react");
const App_1 = require("./App");
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
test('theme toggle has tooltip', async () => {
    (0, react_1.render)(<App_1.App />);
    const toggleBtn = react_1.screen.getByLabelText('toggle theme');
    // Hover to show tooltip
    react_1.fireEvent.mouseOver(toggleBtn);
    // Default is light mode, so tooltip should say "Switch to dark mode"
    await (0, react_1.waitFor)(() => {
        expect(react_1.screen.getByText('Switch to dark mode')).toBeInTheDocument();
    });
    // Click to toggle
    react_1.fireEvent.click(toggleBtn);
    // Hover again
    react_1.fireEvent.mouseOut(toggleBtn);
    react_1.fireEvent.mouseOver(toggleBtn);
    // Now in dark mode, tooltip should say "Switch to light mode"
    await (0, react_1.waitFor)(() => {
        expect(react_1.screen.getByText('Switch to light mode')).toBeInTheDocument();
    });
});
