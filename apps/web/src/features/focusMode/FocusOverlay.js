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
exports.FocusOverlay = void 0;
const react_1 = __importStar(require("react"));
const hooks_1 = require("../../store/hooks");
const FocusOverlay = () => {
    const { enabled, activeRegion } = (0, hooks_1.useAppSelector)(s => s.focus);
    const reducedMotion = (0, react_1.useMemo)(() => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false, []);
    const reducedTransparency = (0, react_1.useMemo)(() => window.matchMedia?.('(prefers-reduced-transparency: reduce)').matches ??
        false, []);
    const base = enabled ? 'ig-dim-overlay' : 'ig-dim-overlay ig-dim-hidden';
    const klass = `${base} ${reducedTransparency ? 'ig-no-blur' : ''} ${reducedMotion ? 'ig-fast' : ''}`;
    return (<>
      {/* One overlay per pane: non-active panes are dimmed */}
      <div id="ov-graph" className={`${klass} ${activeRegion !== 'graph' ? 'on' : 'off'}`}/>
      <div id="ov-map" className={`${klass} ${activeRegion !== 'map' ? 'on' : 'off'}`}/>
      <div id="ov-timeline" className={`${klass} ${activeRegion !== 'timeline' ? 'on' : 'off'}`}/>
      <div id="ov-codex" className={`${klass} ${activeRegion !== 'codex' ? 'on' : 'off'}`}/>
    </>);
};
exports.FocusOverlay = FocusOverlay;
