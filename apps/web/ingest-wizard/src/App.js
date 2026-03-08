"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = App;
const react_1 = __importDefault(require("react"));
const jquery_1 = __importDefault(require("jquery"));
function App() {
    react_1.default.useEffect(() => { (0, jquery_1.default)('#next').on('click', () => (0, jquery_1.default)('#status').text('mapping…')); }, []);
    return (<div><button id="next">Next</button><div id="status">ready</div></div>);
}
