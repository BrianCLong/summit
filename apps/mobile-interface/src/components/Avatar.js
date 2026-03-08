"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Avatar = Avatar;
// @ts-nocheck
const react_1 = __importDefault(require("react"));
function Avatar({ src, alt = '', size = 'md', className = '', fallback }) {
    const sizeStyles = {
        sm: 'h-8 w-8',
        md: 'h-10 w-10',
        lg: 'h-12 w-12',
    };
    if (!src) {
        const initial = fallback?.[0]?.toUpperCase() || alt?.[0]?.toUpperCase() || '?';
        return (<div className={`inline-flex items-center justify-center rounded-full bg-gray-200 text-gray-600 ${sizeStyles[size]} ${className}`}>
        <span className="text-sm font-medium">{initial}</span>
      </div>);
    }
    return (<img src={src} alt={alt} className={`inline-block rounded-full ${sizeStyles[size]} ${className}`}/>);
}
