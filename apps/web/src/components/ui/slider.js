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
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.Slider = void 0;
const React = __importStar(require("react"));
const utils_1 = require("@/lib/utils");
const Slider = React.forwardRef(({ className, value, defaultValue, onValueChange, onChange, max = 100, min = 0, step = 1, ...props }, ref) => {
    const [internalValue, setInternalValue] = React.useState(value?.[0] ?? defaultValue?.[0] ?? min);
    const currentValue = value?.[0] ?? internalValue;
    const handleChange = (event) => {
        const newValue = Number(event.target.value);
        setInternalValue(newValue);
        if (onChange) {
            onChange(event);
        }
        if (onValueChange) {
            onValueChange([newValue]);
        }
    };
    return (<input type="range" className={(0, utils_1.cn)('w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700', className)} ref={ref} value={currentValue} onChange={handleChange} max={max} min={min} step={step} {...props}/>);
});
exports.Slider = Slider;
Slider.displayName = 'Slider';
