"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = App;
const react_1 = __importDefault(require("react"));
const material_1 = require("@mui/material");
const react_cytoscapejs_1 = __importDefault(require("react-cytoscapejs"));
const jquery_1 = __importDefault(require("jquery"));
function App() {
    const cyRef = react_1.default.useRef(null);
    react_1.default.useEffect(() => {
        if (cyRef.current) {
            (0, jquery_1.default)(cyRef.current).on("mousedown", () => {
                /* enhance drag */
            });
        }
    }, []);
    return (<>
      <material_1.CssBaseline />
      <material_1.TextField aria-label="search" placeholder="Search cases"/>
      <material_1.Button>Open Case</material_1.Button>
      <div style={{ height: 400 }}>
        <react_cytoscapejs_1.default cy={(cy) => {
            cyRef.current = cy;
        }} elements={[{ data: { id: "a" } }, { data: { id: "b" } }, { data: { id: "ab", source: "a", target: "b" } }]}/>
      </div>
      <div id="timeline">
        <div className="brush"/>
      </div>
      <material_1.Button>Save View</material_1.Button>
    </>);
}
