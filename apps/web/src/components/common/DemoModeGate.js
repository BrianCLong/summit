"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DemoModeGate = DemoModeGate;
const react_1 = __importDefault(require("react"));
const react_router_dom_1 = require("react-router-dom");
const demoMode_1 = require("@/lib/demoMode");
function DemoModeGate({ children }) {
    const location = (0, react_router_dom_1.useLocation)();
    if (!(0, demoMode_1.isDemoModeEnabled)()) {
        return <react_router_dom_1.Navigate to="/" replace state={{ from: location.pathname }}/>;
    }
    return children;
}
