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
exports.default = SLOBoard;
const react_1 = __importStar(require("react"));
function SLOBoard() {
    const [d, setD] = (0, react_1.useState)(null);
    async function load(controller) {
        try {
            const r = await fetch('/api/slo?runbook=demo&tenant=acme', {
                signal: controller?.signal,
            });
            setD(await r.json());
        }
        catch (err) {
            if (err.name !== 'AbortError') {
                console.error('Fetch error:', err);
            }
        }
    }
    (0, react_1.useEffect)(() => {
        const controller = new AbortController();
        load(controller);
        const t = setInterval(() => {
            if (!controller.signal.aborted) {
                load(controller);
            }
        }, 5000);
        return () => {
            controller.abort();
            clearInterval(t);
        };
    }, []);
    return (<div className="p-4 rounded-2xl shadow">
      <h3 className="text-lg font-semibold">SLOs</h3>
      {d && (<div className="text-sm">
          p95: {Math.round(d.p95)}ms • success:{' '}
          {Number(d.successRatePct).toFixed(2)}% • cost/run: $
          {Number(d.costPerRunUsd).toFixed(2)} • burn:{' '}
          {(Number(d.burnRate) * 100).toFixed(0)}%
        </div>)}
    </div>);
}
