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
const react_1 = __importStar(require("react"));
const material_1 = require("@mui/material");
/**
 * WhyPathsOverlay highlights edges returned from a graphRAG query.
 * It keeps render times in a histogram and warns if p95 > 50ms.
 */
const WhyPathsOverlay = ({ cy, paths, open }) => {
    const times = (0, react_1.useRef)([]);
    (0, react_1.useEffect)(() => {
        if (!cy || !open)
            return;
        const start = performance.now();
        const limited = paths.slice(0, 200); // cap to 200 elements
        const ids = limited.map((p) => p.relId);
        cy.batch(() => {
            cy.elements('.why-path').removeClass('why-path');
            ids.forEach((id) => {
                const ele = cy.$(`edge[id = "${id}"]`);
                if (ele.nonempty()) {
                    ele.addClass('why-path');
                    if (paths.find((p) => p.relId === id)?.text) {
                        ele.qtip?.({
                            content: paths.find((p) => p.relId === id)?.text,
                            show: { solo: true },
                            hide: { event: 'mouseout unfocus' },
                        });
                    }
                }
            });
        });
        const ms = performance.now() - start;
        const telemetry = window.__telemetry ||
            (window.__telemetry = { ui_overlay_render_ms: [] });
        telemetry.ui_overlay_render_ms.push(ms);
        times.current.push(ms);
        const sorted = [...times.current].sort((a, b) => a - b);
        const p95 = sorted[Math.floor(sorted.length * 0.95)] || 0;
        if (p95 > 50)
            console.warn('ui_overlay_render_ms p95>50ms');
    }, [cy, paths, open]);
    if (!open)
        return null;
    return (<material_1.Box role="presentation" sx={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}/>);
};
exports.default = WhyPathsOverlay;
