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
exports.Kbd = void 0;
const React = __importStar(require("react"));
const utils_1 = require("@/lib/utils");
/**
 * Standardized keyboard shortcut hint component.
 * Follows accessibility guidelines for the <kbd> element.
 */
const Kbd = React.forwardRef(({ className, children, ...props }, ref) => {
    const processChild = (child) => {
        if (typeof child === 'string') {
            const lowerChild = child.toLowerCase();
            if (lowerChild === 'mod' || lowerChild === 'command' || lowerChild === 'ctrl') {
                return utils_1.MODIFIER_KEY;
            }
            if (lowerChild === 'shift') {
                return utils_1.SHIFT_KEY;
            }
            return child;
        }
        return child;
    };
    const processedChildren = React.Children.map(children, processChild);
    return (<kbd ref={ref} className={(0, utils_1.cn)('pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100', className)} {...props}>
        {processedChildren}
      </kbd>);
});
exports.Kbd = Kbd;
Kbd.displayName = 'Kbd';
