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
exports.CommandPalette = void 0;
const react_1 = __importStar(require("react"));
const store_1 = require("./store");
const SAVED_QUERIES = ['recent-incidents', 'top-entities'];
function openNlqModal() {
    const event = new CustomEvent('intelgraph:nlq:open');
    window.dispatchEvent(event);
}
const CommandPalette = () => {
    const runQuery = (0, store_1.useAnalysisStore)((s) => s.runQuery);
    const [open, setOpen] = (0, react_1.useState)(false);
    (0, react_1.useEffect)(() => {
        const handler = (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                setOpen((v) => !v);
            }
            if (e.key === 'Escape')
                setOpen(false);
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, []);
    if (!open)
        return null;
    return (<div data-testid="command-palette" className="absolute inset-0 bg-black/50 flex items-center justify-center">
      <div className="bg-white text-black p-4 space-y-2">
        <button onClick={() => {
            openNlqModal();
            setOpen(false);
        }} className="block w-full text-left p-2 hover:bg-gray-100">
          Open NL → Cypher (Preview)
        </button>
        {SAVED_QUERIES.map((q) => (<button key={q} onClick={() => {
                runQuery(q);
                setOpen(false);
            }} className="block w-full text-left p-2 hover:bg-gray-100">
            {q}
          </button>))}
      </div>
    </div>);
};
exports.CommandPalette = CommandPalette;
exports.default = exports.CommandPalette;
