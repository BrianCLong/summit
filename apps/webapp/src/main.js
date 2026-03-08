"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("./tracing"); // Initialize OpenTelemetry before anything else
const react_1 = __importDefault(require("react"));
const client_1 = __importDefault(require("react-dom/client"));
const App_1 = require("./App");
const store_1 = require("./store");
const telemetry_1 = require("./telemetry");
// Expose store for tests
window.store = store_1.store;
client_1.default.createRoot(document.getElementById('root')).render(<react_1.default.StrictMode>
    <App_1.App />
  </react_1.default.StrictMode>);
(0, telemetry_1.reportWebVitals)();
