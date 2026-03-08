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
exports.XaiDrawer = void 0;
const react_1 = __importStar(require("react"));
const jquery_1 = __importDefault(require("jquery"));
const XaiDrawer = ({ isOpen, anomalyId, onClose }) => {
    const drawerRef = (0, react_1.useRef)(null);
    const [shouldRender, setShouldRender] = (0, react_1.useState)(isOpen);
    (0, react_1.useEffect)(() => {
        if (isOpen) {
            setShouldRender(true);
            // Wait for render, then animate in
            setTimeout(() => {
                if (drawerRef.current) {
                    (0, jquery_1.default)(drawerRef.current).css('right', '-300px').animate({ right: '0px' }, 300);
                }
            }, 0);
        }
        else {
            // Animate out, then unmount
            if (drawerRef.current) {
                (0, jquery_1.default)(drawerRef.current).animate({ right: '-300px' }, 300, () => {
                    setShouldRender(false);
                });
            }
        }
    }, [isOpen]);
    if (!shouldRender)
        return null;
    return (<div ref={drawerRef} style={{
            position: 'fixed',
            top: 0,
            bottom: 0,
            right: isOpen ? 0 : '-300px', // Initial state for animate
            width: '300px',
            background: 'white',
            boxShadow: '-2px 0 5px rgba(0,0,0,0.1)',
            zIndex: 1000,
            padding: '20px',
        }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>Anomaly Explanation</h2>
        <button onClick={onClose}>Close</button>
      </div>
      <div>
        <p>Analyzing Anomaly ID: {anomalyId}</p>
        <div id="xai-content">
           Loading explanation...
        </div>
      </div>
    </div>);
};
exports.XaiDrawer = XaiDrawer;
