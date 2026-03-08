"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LoadingSpinner = LoadingSpinner;
// @ts-nocheck
const react_1 = __importDefault(require("react"));
function LoadingSpinner({ size = 'md', className = '' }) {
    const sizeStyles = {
        sm: 'h-4 w-4 border-2',
        md: 'h-8 w-8 border-2',
        lg: 'h-12 w-12 border-4',
    };
    return (<div className={`animate-spin rounded-full border-gray-300 border-t-blue-600 ${sizeStyles[size]} ${className}`}/>);
}
