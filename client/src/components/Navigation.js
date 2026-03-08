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
const react_router_dom_1 = require("react-router-dom");
const NotificationSystem_1 = __importDefault(require("./NotificationSystem"));
const socket_1 = require("../services/socket");
function Navigation() {
    const navigate = (0, react_router_dom_1.useNavigate)();
    const location = (0, react_router_dom_1.useLocation)();
    const [alertCount, setAlertCount] = (0, react_1.useState)(0);
    const isHome = location.pathname === '/';
    const isAction = location.pathname.startsWith('/actions/');
    (0, react_1.useEffect)(() => {
        const s = (0, socket_1.getSocket)();
        if (!s)
            return;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const handler = (_evt) => setAlertCount((c) => c + 1);
        s.on('ALERT_EVT', handler);
        const uiHandler = () => setAlertCount((c) => c + 1);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        window.addEventListener('ig:ALERT_EVT', uiHandler);
        return () => {
            try {
                s.off('ALERT_EVT', handler);
                // eslint-disable-next-line no-empty
            }
            catch { }
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            window.removeEventListener('ig:ALERT_EVT', uiHandler);
        };
    }, []);
    return (<nav style={{
            backgroundColor: '#fff',
            borderBottom: '1px solid var(--hairline)',
            padding: '12px 24px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
        }}>
      <button aria-label="Home" style={{
            background: 'none',
            border: 'none',
            padding: 0,
            font: 'inherit',
            textAlign: 'left',
            fontSize: '1.2rem',
            fontWeight: '600',
            color: '#1a73e8',
            cursor: 'pointer',
        }} onClick={() => navigate('/')}>
        IntelGraph
      </button>

      <div style={{ flex: 1 }}></div>

      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
        <NotificationSystem_1.default position="top-right" maxNotifications={5}/>
        <button title="Watchlists & Alerts" aria-label="Watchlists and Alerts" onClick={() => {
            setAlertCount(0);
            navigate('/osint/watchlists');
        }} style={{
            position: 'relative',
            padding: '6px 10px',
            border: '1px solid var(--hairline)',
            borderRadius: 6,
            background: '#f6f7f9',
            cursor: 'pointer',
        }}>
          🔔 Alerts
          {alertCount > 0 && (<span style={{
                position: 'absolute',
                top: -6,
                right: -6,
                background: '#e11d48',
                color: '#fff',
                borderRadius: 12,
                fontSize: 12,
                padding: '2px 6px',
            }}>
              {alertCount}
            </span>)}
        </button>
        <button title="Watchlists" aria-label="Watchlists" onClick={() => navigate('/osint/watchlists')} style={{
            padding: '6px 10px',
            border: '1px solid var(--hairline)',
            borderRadius: 6,
            background: '#f6f7f9',
            cursor: 'pointer',
        }}>
          📋 Watchlists
        </button>
        <button title="OSINT Studio" aria-label="OSINT Studio" onClick={() => navigate('/osint')} style={{
            padding: '6px 10px',
            border: '1px solid var(--hairline)',
            borderRadius: 6,
            background: '#f6f7f9',
            cursor: 'pointer',
        }}>
          🛰️ OSINT
        </button>

        {!isHome && (<button aria-label="Go back to Home" onClick={() => navigate('/')} style={{
                padding: '6px 12px',
                backgroundColor: 'transparent',
                border: '1px solid var(--hairline)',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px',
                color: '#666',
            }}>
            ← Home
          </button>)}

        {isAction && (<div style={{
                fontSize: '14px',
                color: '#666',
                padding: '6px 12px',
                backgroundColor: '#f8f9fa',
                borderRadius: '4px',
            }}>
            Action: {location.pathname.split('/')[2]}
          </div>)}

        <div style={{
            fontSize: '12px',
            color: '#999',
            padding: '4px',
        }}>
          {location.pathname}
        </div>
      </div>
    </nav>);
}
exports.default = Navigation;
