"use strict";
/**
 * Help Search Component
 * Search input for KB content
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
exports.HelpSearch = HelpSearch;
const react_1 = __importStar(require("react"));
const HelpContext_js_1 = require("../HelpContext.js");
function HelpSearch({ placeholder = 'Search help...', className = '', onResultSelect, }) {
    const { searchQuery, setSearchQuery, search, isSearching } = (0, HelpContext_js_1.useHelp)();
    const inputRef = (0, react_1.useRef)(null);
    const debounceRef = (0, react_1.useRef)();
    // Focus input on mount
    (0, react_1.useEffect)(() => {
        inputRef.current?.focus();
    }, []);
    const handleChange = (0, react_1.useCallback)((event) => {
        const value = event.target.value;
        setSearchQuery(value);
        // Debounce search
        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
        }
        debounceRef.current = setTimeout(() => {
            search(value);
        }, 300);
    }, [setSearchQuery, search]);
    const handleKeyDown = (0, react_1.useCallback)((event) => {
        if (event.key === 'Escape') {
            setSearchQuery('');
            inputRef.current?.blur();
        }
    }, [setSearchQuery]);
    const inputStyles = {
        width: '100%',
        padding: '10px 12px',
        fontSize: '14px',
        border: '1px solid #ddd',
        borderRadius: '6px',
        outline: 'none',
        boxSizing: 'border-box',
    };
    const containerStyles = {
        position: 'relative',
    };
    return (<div className={className} style={className ? undefined : containerStyles}>
      <input ref={inputRef} type="search" value={searchQuery} onChange={handleChange} onKeyDown={handleKeyDown} placeholder={placeholder} style={inputStyles} aria-label="Search help"/>
      {isSearching && (<span style={{
                position: 'absolute',
                right: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                fontSize: '12px',
                color: '#666',
            }}>
          Searching...
        </span>)}
    </div>);
}
