"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importDefault(require("react"));
const client_1 = __importDefault(require("react-dom/client"));
const App_link_analysis_1 = __importDefault(require("./App.link-analysis"));
require("./styles/globals.css");
const root = document.getElementById('root');
client_1.default.createRoot(root).render(<react_1.default.StrictMode>
    <App_link_analysis_1.default />
  </react_1.default.StrictMode>);
