"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importDefault(require("react"));
const client_1 = __importDefault(require("react-dom/client"));
const App_tsx_1 = __importDefault(require("./App.tsx"));
const App_1 = __importDefault(require("./maestro/App"));
require("./index.css"); // Assuming default Vite CSS
const root = client_1.default.createRoot(document.getElementById('root'));
// Choose UI surface without overwriting existing app:
// Default to Maestro UI unless Symphony is specifically requested
const url = new URL(window.location.href);
const wantSymphony = url.searchParams.get('ui') === 'symphony' ||
    url.pathname.startsWith('/symphony');
root.render(<react_1.default.StrictMode>
    {wantSymphony ? <App_tsx_1.default /> : <App_1.default />}
  </react_1.default.StrictMode>);
