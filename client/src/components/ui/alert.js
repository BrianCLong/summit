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
exports.AlertDescription = exports.Alert = void 0;
const React = __importStar(require("react"));
const utils_1 = require("@/lib/utils");
const variantClasses = {
    default: 'border-border bg-background text-foreground',
    destructive: 'border-red-500/50 text-red-900 dark:text-red-50 bg-red-50',
};
const Alert = React.forwardRef(({ className, variant = 'default', ...props }, ref) => (<div ref={ref} role="alert" className={(0, utils_1.cn)('relative w-full rounded-lg border px-4 py-3 text-sm shadow-sm transition-colors', variantClasses[variant], className)} {...props}/>));
exports.Alert = Alert;
Alert.displayName = 'Alert';
const AlertDescription = React.forwardRef(({ className, ...props }, ref) => (<p ref={ref} className={(0, utils_1.cn)('text-sm leading-relaxed', className)} {...props}/>));
exports.AlertDescription = AlertDescription;
AlertDescription.displayName = 'AlertDescription';
