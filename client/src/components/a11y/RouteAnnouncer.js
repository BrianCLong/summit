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
exports.RouteAnnouncer = RouteAnnouncer;
const react_1 = __importStar(require("react"));
const react_router_dom_1 = require("react-router-dom");
const useFeatureFlag_1 = require("../../hooks/useFeatureFlag");
const visuallyHidden = {
    position: 'absolute',
    width: '1px',
    height: '1px',
    padding: 0,
    margin: '-1px',
    overflow: 'hidden',
    clip: 'rect(0, 0, 0, 0)',
    border: 0,
};
function RouteAnnouncer({ mainRef, routeLabels }) {
    const location = (0, react_router_dom_1.useLocation)();
    const guardrailsEnabled = (0, useFeatureFlag_1.useFeatureFlag)('ui.a11yGuardrails');
    const [message, setMessage] = (0, react_1.useState)('Navigation ready');
    const currentLabel = (0, react_1.useMemo)(() => {
        const rawLabel = routeLabels[location.pathname] ||
            location.pathname.replace('/', '') ||
            'current page';
        return rawLabel.trim() || 'current page';
    }, [location.pathname, routeLabels]);
    (0, react_1.useEffect)(() => {
        if (!guardrailsEnabled) {
            return;
        }
        setMessage(`Navigated to ${currentLabel}`);
        if (mainRef?.current) {
            mainRef.current.focus({ preventScroll: true });
        }
    }, [currentLabel, guardrailsEnabled, mainRef]);
    if (!guardrailsEnabled) {
        return null;
    }
    return (<div aria-live="polite" role="status" aria-atomic="true" style={visuallyHidden} data-testid="route-announcer">
      {message}
    </div>);
}
exports.default = RouteAnnouncer;
