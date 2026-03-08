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
exports.AlertDescription = exports.AlertTitle = exports.Alert = void 0;
const React = __importStar(require("react"));
const utils_1 = require("@/lib/utils");
const Alert = React.forwardRef(({ className, variant = 'default', ...props }, ref) => {
    const variantClasses = {
        default: 'bg-background text-foreground border-border',
        destructive: 'border-destructive/50 text-destructive dark:border-destructive [&>svg]:text-destructive',
        success: 'border-green-500/50 text-green-700 dark:border-green-500 [&>svg]:text-green-700',
        warning: 'border-yellow-500/50 text-yellow-700 dark:border-yellow-500 [&>svg]:text-yellow-700',
    };
    return (<div ref={ref} role="alert" className={(0, utils_1.cn)('relative w-full rounded-lg border p-4 [&>svg~*]:pl-7 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground', variantClasses[variant], className)} {...props}/>);
});
exports.Alert = Alert;
Alert.displayName = 'Alert';
const AlertTitle = React.forwardRef(({ className, ...props }, ref) => (<h5 ref={ref} className={(0, utils_1.cn)('mb-1 font-medium leading-none tracking-tight', className)} {...props}/>));
exports.AlertTitle = AlertTitle;
AlertTitle.displayName = 'AlertTitle';
const AlertDescription = React.forwardRef(({ className, ...props }, ref) => (<div ref={ref} className={(0, utils_1.cn)('text-sm [&_p]:leading-relaxed', className)} {...props}/>));
exports.AlertDescription = AlertDescription;
AlertDescription.displayName = 'AlertDescription';
