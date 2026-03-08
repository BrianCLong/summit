"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.useDemoMode = exports.isDemoModeEnabled = void 0;
const react_1 = __importDefault(require("react"));
const isDemoModeEnabled = () => {
    const flag = import.meta.env.VITE_DEMO_MODE;
    if (!flag) {
        return false;
    }
    return flag === '1' || flag.toLowerCase() === 'true';
};
exports.isDemoModeEnabled = isDemoModeEnabled;
const useDemoMode = () => react_1.default.useMemo(() => (0, exports.isDemoModeEnabled)(), []);
exports.useDemoMode = useDemoMode;
