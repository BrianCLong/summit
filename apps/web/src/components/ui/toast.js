"use strict";
// @ts-nocheck
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
exports.ToastAction = exports.ToastClose = exports.ToastDescription = exports.ToastTitle = exports.Toast = exports.ToastViewport = exports.ToastProvider = void 0;
const React = __importStar(require("react"));
const ToastPrimitives = __importStar(require("@radix-ui/react-toast"));
const lucide_react_1 = require("lucide-react");
const utils_1 = require("@/lib/utils");
const tokens_1 = require("@/theme/tokens");
const ToastProvider = ToastPrimitives.Provider;
exports.ToastProvider = ToastProvider;
const ToastViewport = React.forwardRef(({ className, ...props }, ref) => (<ToastPrimitives.Viewport ref={ref} className={(0, utils_1.cn)('fixed bottom-4 right-4 z-[var(--ds-z-toast,650)] flex w-[420px] max-w-[min(90vw,520px)] flex-col gap-3 p-4 outline-none', className)} style={{
        gap: (0, tokens_1.tokenVar)('ds-space-sm'),
        zIndex: tokens_1.tokens.zIndices.toast,
    }} {...props}/>));
exports.ToastViewport = ToastViewport;
ToastViewport.displayName = ToastPrimitives.Viewport.displayName;
const Toast = React.forwardRef(({ className, ...props }, ref) => (<ToastPrimitives.Root ref={ref} className={(0, utils_1.cn)('group pointer-events-auto relative flex w-full flex-col gap-2 overflow-hidden rounded-lg border border-border bg-background shadow-lg', 'data-[state=open]:animate-in data-[state=closed]:animate-out data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=cancel]:translate-x-0', 'data-[state=closed]:fade-out-80 data-[state=open]:slide-in-from-right-full data-[state=open]:sm:slide-in-from-bottom-4 data-[state=open]:sm:slide-in-from-right-4 data-[swipe=end]:animate-out data-[swipe=end]:slide-out-to-right-full', className)} {...props}/>));
exports.Toast = Toast;
Toast.displayName = ToastPrimitives.Root.displayName;
const ToastAction = React.forwardRef(({ className, ...props }, ref) => (<ToastPrimitives.Action ref={ref} className={(0, utils_1.cn)('inline-flex items-center justify-center rounded-md border border-transparent bg-primary px-3 py-1 text-sm font-medium text-primary-foreground ring-offset-background transition-colors hover:bg-primary/80 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50', className)} {...props}/>));
exports.ToastAction = ToastAction;
ToastAction.displayName = ToastPrimitives.Action.displayName;
const ToastClose = React.forwardRef(({ className, ...props }, ref) => (<ToastPrimitives.Close ref={ref} className={(0, utils_1.cn)('absolute right-3 top-3 rounded-md p-1 text-foreground/70 opacity-0 transition-opacity hover:text-foreground focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 group-hover:opacity-100', className)} aria-label="Close" {...props}>
    <lucide_react_1.X className="h-4 w-4"/>
  </ToastPrimitives.Close>));
exports.ToastClose = ToastClose;
ToastClose.displayName = ToastPrimitives.Close.displayName;
const ToastTitle = React.forwardRef(({ className, ...props }, ref) => (<ToastPrimitives.Title ref={ref} className={(0, utils_1.cn)('text-sm font-semibold leading-none', className)} style={{ lineHeight: (0, tokens_1.tokenVar)('ds-line-height-tight') }} {...props}/>));
exports.ToastTitle = ToastTitle;
ToastTitle.displayName = ToastPrimitives.Title.displayName;
const ToastDescription = React.forwardRef(({ className, ...props }, ref) => (<ToastPrimitives.Description ref={ref} className={(0, utils_1.cn)('text-sm text-muted-foreground', className)} style={{ lineHeight: (0, tokens_1.tokenVar)('ds-line-height-standard') }} {...props}/>));
exports.ToastDescription = ToastDescription;
ToastDescription.displayName = ToastPrimitives.Description.displayName;
