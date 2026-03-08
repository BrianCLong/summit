"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importDefault(require("react"));
const LoadingSpinner = ({ size = 'md', message = 'Loading...', className = '', }) => {
    const sizeClasses = {
        sm: 'w-4 h-4',
        md: 'w-8 h-8',
        lg: 'w-12 h-12',
    };
    return (<div className={`flex flex-col items-center justify-center p-4 ${className}`} role="status" aria-live="polite">
      <div className={`animate-spin rounded-full border-2 border-gray-300 border-t-blue-600 ${sizeClasses[size]}`}></div>
      {message && <p className="mt-2 text-sm text-gray-600">{message}</p>}
    </div>);
};
exports.default = LoadingSpinner;
