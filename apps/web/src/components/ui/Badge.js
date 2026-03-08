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
exports.badgeVariants = void 0;
exports.Badge = Badge;
const React = __importStar(require("react"));
const class_variance_authority_1 = require("class-variance-authority");
const utils_1 = require("@/lib/utils");
const badgeVariants = (0, class_variance_authority_1.cva)('inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2', {
    variants: {
        variant: {
            default: 'border-transparent bg-primary text-primary-foreground hover:bg-primary/80',
            secondary: 'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80',
            destructive: 'border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80',
            outline: 'text-foreground',
            success: 'border-transparent bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
            warning: 'border-transparent bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
            error: 'border-transparent bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
            info: 'border-transparent bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
            // IntelGraph specific variants
            'threat-low': 'border-transparent bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
            'threat-medium': 'border-transparent bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
            'threat-high': 'border-transparent bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
            'threat-critical': 'border-transparent bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
            intel: 'border-transparent bg-intel-100 text-intel-800 dark:bg-intel-900 dark:text-intel-300',
        },
    },
    defaultVariants: {
        variant: 'default',
    },
});
exports.badgeVariants = badgeVariants;
function Badge({ className, variant, 'data-ai-suggestion': isAiSuggestion, ...props }) {
    // We can't use useSelector here if Badge is used outside of Redux context or in a pure presentation way
    // But Badge is a UI component.
    // Ideally, the parent should hide it, but "Invisible Hand" implies a global toggle that hides ALL badges that might be AI.
    // If we can't easily hook into store here without breaking tests or Storybook, we should use a CSS class approach.
    // The 'invisibleHandMode' adds a class to the body, and we use CSS to hide things.
    // Let's rely on the body class 'invisible-hand-mode' which we can set in App.tsx or similar.
    return (<div className={(0, utils_1.cn)(badgeVariants({ variant }), className, isAiSuggestion ? 'ai-suggestion-badge' : '')} {...props}/>);
}
