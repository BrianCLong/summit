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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importStar(require("react"));
const GoldenPathValidator_1 = __importDefault(require("./golden-path/GoldenPathValidator"));
/**
 * DebugOverlay component
 * Displays current route, user context, and Golden Path validation status.
 * Can be toggled with a keyboard shortcut (e.g., Ctrl+Backtick).
 */
const DebugOverlay = () => {
    const [isVisible, setIsVisible] = (0, react_1.useState)(false);
    const [breadcrumbs, setBreadcrumbs] = (0, react_1.useState)([]);
    // We can try to use location if Router is available, but TestApp doesn't seem to have a Router at root.
    // It might be inside a provider or not used. We'll use window.location as fallback.
    (0, react_1.useEffect)(() => {
        const handleKeydown = (e) => {
            // Toggle on Ctrl + ` (Backtick)
            if (e.ctrlKey && e.key === '`') {
                setIsVisible(prev => !prev);
            }
        };
        window.addEventListener('keydown', handleKeydown);
        return () => window.removeEventListener('keydown', handleKeydown);
    }, []);
    (0, react_1.useEffect)(() => {
        // Simple breadcrumb tracking via history api patching or polling
        // Since we are outside Router context potentially, we use a simple listener
        const updateBreadcrumb = () => {
            const path = window.location.pathname;
            setBreadcrumbs(prev => {
                const newItem = `${new Date().toLocaleTimeString()} - ${path}`;
                if (prev[prev.length - 1] === newItem)
                    return prev;
                return [...prev.slice(-4), newItem];
            });
        };
        updateBreadcrumb();
        window.addEventListener('popstate', updateBreadcrumb);
        // Determine if we can hook into pushState? A bit invasive.
        // We'll just update on interval for simplicity in this overlay
        const interval = setInterval(updateBreadcrumb, 1000);
        return () => {
            window.removeEventListener('popstate', updateBreadcrumb);
            clearInterval(interval);
        };
    }, []);
    if (!isVisible)
        return null;
    return (<div style={{
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            width: '400px',
            maxHeight: '80vh',
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            color: '#00ff00',
            fontFamily: 'monospace',
            padding: '16px',
            borderRadius: '8px',
            zIndex: 9999,
            overflowY: 'auto',
            boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
            border: '1px solid #333'
        }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
        <strong>🕵️ Debug Overlay</strong>
        <button onClick={() => setIsVisible(false)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>✕</button>
      </div>

      <div style={{ marginBottom: '10px' }}>
        <strong>Current Path:</strong> {window.location.pathname}
      </div>

      <div style={{ marginBottom: '10px' }}>
        <strong>Breadcrumbs:</strong>
        <ul style={{ paddingLeft: '15px', margin: '5px 0' }}>
          {breadcrumbs.map((b, i) => <li key={i} style={{ fontSize: '0.85em' }}>{b}</li>)}
        </ul>
      </div>

      <div style={{ borderTop: '1px solid #444', paddingTop: '10px' }}>
        <strong>Golden Path Status:</strong>
        <div style={{ marginTop: '5px', backgroundColor: '#fff', padding: '5px', borderRadius: '4px' }}>
             <GoldenPathValidator_1.default />
        </div>
      </div>
    </div>);
};
exports.default = DebugOverlay;
