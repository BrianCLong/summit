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
exports.default = HistoryControls;
const react_1 = __importStar(require("react"));
const jquery_1 = __importDefault(require("jquery"));
const hooks_1 = require("../../store/hooks");
function HistoryControls() {
    const d = (0, hooks_1.useAppDispatch)();
    const hist = (0, hooks_1.useAppSelector)(s => s.history);
    (0, react_1.useEffect)(() => {
        const $root = (0, jquery_1.default)(document.body);
        const onKey = (e) => {
            const z = (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z';
            if (!z) {
                return;
            }
            if (e.shiftKey) {
                d({ type: 'history/redo' });
            }
            else {
                d({ type: 'history/undo' });
            }
            $root.trigger('intelgraph:history:key', [{ redo: e.shiftKey }]);
            e.preventDefault();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [d]);
    return (<div className="history-ctrls">
      <button data-test="btn-undo" onClick={() => d({ type: 'history/undo' })} disabled={!hist.undo.length}>
        Undo
      </button>
      <button data-test="btn-redo" onClick={() => d({ type: 'history/redo' })} disabled={!hist.redo.length}>
        Redo
      </button>
    </div>);
}
