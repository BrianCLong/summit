"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.act = void 0;
exports.renderHook = renderHook;
const react_1 = __importDefault(require("react"));
const react_2 = require("@testing-library/react");
function renderHook(cb) {
    const result = { current: undefined };
    function HookContainer() {
        result.current = cb();
        return null;
    }
    const { unmount, rerender } = (0, react_2.render)(react_1.default.createElement(HookContainer));
    return {
        result: result,
        unmount,
        rerender: () => rerender(react_1.default.createElement(HookContainer)),
    };
}
exports.act = react_2.act;
