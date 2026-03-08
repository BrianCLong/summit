"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.store = void 0;
const toolkit_1 = require("@reduxjs/toolkit");
const focusSlice_1 = __importDefault(require("../features/focusMode/focusSlice"));
const historySlice_1 = __importDefault(require("../features/history/historySlice"));
const explainSlice_1 = __importDefault(require("../features/explain/explainSlice"));
const uiSlice_1 = __importDefault(require("../features/ui/uiSlice"));
const annotationsSlice_1 = __importDefault(require("../features/annotations/annotationsSlice"));
const historyMiddleware_1 = require("../features/history/historyMiddleware");
const immer_1 = require("immer");
(0, immer_1.enablePatches)();
exports.store = (0, toolkit_1.configureStore)({
    reducer: {
        focus: focusSlice_1.default,
        history: historySlice_1.default,
        explain: explainSlice_1.default,
        ui: uiSlice_1.default,
        annotations: annotationsSlice_1.default,
    },
    middleware: gDM => gDM().concat(historyMiddleware_1.historyMiddleware),
});
