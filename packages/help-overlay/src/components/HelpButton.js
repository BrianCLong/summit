"use strict";
/**
 * Help Button Component
 * Trigger button for opening contextual help
 */
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
exports.HelpButton = HelpButton;
const react_1 = __importStar(require("react"));
const HelpContext_js_1 = require("../HelpContext.js");
function HelpButton({ anchorKey, className = '', children, }) {
    const { openHelp, fetchContextualHelp, setCurrentArticle } = (0, HelpContext_js_1.useHelp)();
    const handleClick = (0, react_1.useCallback)(async () => {
        openHelp();
        if (anchorKey) {
            // Fetch contextual help for this anchor
            const currentPath = window.location.pathname;
            const result = await fetchContextualHelp(currentPath, anchorKey);
            if (result && result.articles.length > 0) {
                setCurrentArticle(result.articles[0]);
            }
        }
    }, [anchorKey, openHelp, fetchContextualHelp, setCurrentArticle]);
    const defaultStyles = {
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '24px',
        height: '24px',
        borderRadius: '50%',
        border: '1px solid #ccc',
        background: '#f5f5f5',
        cursor: 'pointer',
        fontSize: '14px',
        fontWeight: 'bold',
        color: '#666',
    };
    return (<button type="button" onClick={handleClick} className={className} style={className ? undefined : defaultStyles} aria-label="Open help" title="Get help (press ? key)">
      {children || '?'}
    </button>);
}
