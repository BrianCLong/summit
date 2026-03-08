"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.App = App;
const react_1 = require("react");
const react_router_dom_1 = require("react-router-dom");
const material_1 = require("@mui/material");
const Brightness4_1 = __importDefault(require("@mui/icons-material/Brightness4"));
const Brightness7_1 = __importDefault(require("@mui/icons-material/Brightness7"));
const Search_1 = __importDefault(require("@mui/icons-material/Search"));
const react_redux_1 = require("react-redux");
const store_1 = require("./store");
const CommandPalette_1 = require("./components/CommandPalette");
const SelectionSummary_1 = require("./components/SelectionSummary");
const GraphPane = (0, react_1.lazy)(() => Promise.resolve().then(() => __importStar(require('./panes/GraphPane'))).then((module) => ({ default: module.GraphPane })));
const TimelinePane = (0, react_1.lazy)(() => Promise.resolve().then(() => __importStar(require('./panes/TimelinePane'))).then((module) => ({
    default: module.TimelinePane,
})));
const MapPane = (0, react_1.lazy)(() => Promise.resolve().then(() => __importStar(require('./panes/MapPane'))).then((module) => ({ default: module.MapPane })));
function App() {
    const [mode, setMode] = (0, react_1.useState)('light');
    const [openCmd, setOpenCmd] = (0, react_1.useState)(false);
    const theme = (0, react_1.useMemo)(() => (0, material_1.createTheme)({ palette: { mode } }), [mode]);
    (0, react_1.useEffect)(() => {
        const handler = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                setOpenCmd((o) => !o);
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, []);
    const toggleMode = () => setMode((m) => (m === 'light' ? 'dark' : 'light'));
    return (<react_redux_1.Provider store={store_1.store}>
      <material_1.ThemeProvider theme={theme}>
        <material_1.CssBaseline />
        <react_router_dom_1.BrowserRouter>
          <CommandPalette_1.CommandPalette open={openCmd} onClose={() => setOpenCmd(false)} toggleTheme={toggleMode} mode={mode}/>
          <material_1.Box display="flex" justifyContent="space-between" alignItems="center" p={1}>
            <SelectionSummary_1.SelectionSummary />
            <material_1.Box>
              <material_1.Tooltip title="Command Palette (Ctrl+K)">
                <material_1.IconButton onClick={() => setOpenCmd(true)} color="inherit" aria-label="open command palette">
                  <Search_1.default />
                </material_1.IconButton>
              </material_1.Tooltip>
              <material_1.Tooltip title={mode === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}>
                <material_1.IconButton onClick={toggleMode} color="inherit" aria-label="toggle theme" data-testid="theme-toggle">
                  {mode === 'light' ? <Brightness4_1.default /> : <Brightness7_1.default />}
                </material_1.IconButton>
              </material_1.Tooltip>
            </material_1.Box>
          </material_1.Box>
          <react_router_dom_1.Routes>
            <react_router_dom_1.Route path="/" element={<react_1.Suspense fallback={<material_1.Box display="flex" justifyContent="center" alignItems="center" height="calc(100vh - 56px)">
                      <material_1.CircularProgress />
                    </material_1.Box>}>
                  <material_1.Box display="grid" gridTemplateColumns="2fr 1fr" gridTemplateRows="1fr 1fr" gridTemplateAreas="'graph timeline' 'graph map'" height="calc(100vh - 56px)">
                    <material_1.Box gridArea="graph" borderRight={1} borderColor="divider" data-testid="graph-pane">
                      <GraphPane />
                    </material_1.Box>
                    <material_1.Box gridArea="timeline" borderBottom={1} borderColor="divider" data-testid="timeline-pane">
                      <TimelinePane />
                    </material_1.Box>
                    <material_1.Box gridArea="map" data-testid="map-pane">
                      <MapPane />
                    </material_1.Box>
                  </material_1.Box>
                </react_1.Suspense>}/>
          </react_router_dom_1.Routes>
        </react_router_dom_1.BrowserRouter>
      </material_1.ThemeProvider>
    </react_redux_1.Provider>);
}
