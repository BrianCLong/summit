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
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.render = void 0;
const react_1 = __importDefault(require("react"));
const react_2 = require("@testing-library/react");
const react_tooltip_1 = require("@radix-ui/react-tooltip");
const react_redux_1 = require("react-redux");
const toolkit_1 = require("@reduxjs/toolkit");
const mockStore = (0, toolkit_1.configureStore)({
    reducer: {},
});
const AllTheProviders = ({ children }) => {
    return (<react_redux_1.Provider store={mockStore}>
      <react_tooltip_1.TooltipProvider>{children}</react_tooltip_1.TooltipProvider>
    </react_redux_1.Provider>);
};
const customRender = (ui, options) => (0, react_2.render)(ui, { wrapper: AllTheProviders, ...options });
exports.render = customRender;
// re-export everything
__exportStar(require("@testing-library/react"), exports);
