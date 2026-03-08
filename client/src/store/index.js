"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.useAppSelector = exports.useAppDispatch = void 0;
const toolkit_1 = require("@reduxjs/toolkit");
const react_redux_1 = require("react-redux");
const ui_1 = __importDefault(require("./slices/ui"));
const store = (0, toolkit_1.configureStore)({
    reducer: { ui: ui_1.default },
});
exports.useAppDispatch = react_redux_1.useDispatch;
exports.useAppSelector = react_redux_1.useSelector;
exports.default = store;
