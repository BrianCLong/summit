"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FederatedSearch = FederatedSearch;
/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
const react_1 = require("react");
const jquery_1 = __importDefault(require("jquery"));
/**
 * FederatedSearch renders a placeholder matrix and demonstrates how jQuery
 * can be combined with React refs for high-frequency interactions.
 */
function FederatedSearch() {
    const matrixRef = (0, react_1.useRef)(null);
    (0, react_1.useEffect)(() => {
        const el = matrixRef.current ? (0, jquery_1.default)(matrixRef.current) : null;
        if (!el) {
            return;
        }
        const handler = (e) => {
            el.text(`x:${e.offsetX}, y:${e.offsetY}`);
        };
        el.on('mousemove', handler);
        return () => {
            el.off('mousemove', handler);
        };
    }, []);
    return <div ref={matrixRef}>Federated search placeholder</div>;
}
