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
exports.default = ModelMatrix;
const react_1 = __importStar(require("react"));
const x_data_grid_1 = require("@mui/x-data-grid");
const socket_io_client_1 = require("socket.io-client");
const jquery_1 = __importDefault(require("jquery"));
const socket = (0, socket_io_client_1.io)('/', { path: '/events' });
const cols = [
    { field: 'id', headerName: 'Model', flex: 1 },
    { field: 'class', headerName: 'Class', width: 100 },
    { field: 'window', headerName: 'Window', width: 110 },
    { field: 'rpm', headerName: 'RPM', width: 90 },
    { field: 'rpmCap', headerName: 'RPM Cap', width: 110 },
    { field: 'tpm', headerName: 'TPM', width: 100 },
    { field: 'tpmCap', headerName: 'TPM Cap', width: 120 },
    {
        field: 'budgetFrac',
        headerName: 'Budget',
        width: 110,
        valueFormatter: v => `${Math.round(Number(v) * 100)}%`,
    },
    { field: 'p95ms', headerName: 'p95', width: 90 },
    { field: 'ttfbms', headerName: 'TTFB', width: 90 },
];
function ModelMatrix() {
    const [rows, setRows] = (0, react_1.useState)([]);
    (0, react_1.useEffect)(() => {
        socket.on('model_stats', (payload) => setRows(payload));
        return () => {
            socket.off('model_stats');
        };
    }, []);
    (0, react_1.useEffect)(() => {
        // subtle attention jQuery pulse on critical thresholds
        rows.forEach(r => {
            if (r.budgetFrac > 0.8 || r.window === 'closed') {
                const el = (0, jquery_1.default)(`div[role=row][data-id="${r.id}"]`);
                el.stop(true, true).fadeOut(100).fadeIn(100);
            }
        });
    }, [rows]);
    return (<div style={{ height: 420, width: '100%' }}>
      <x_data_grid_1.DataGrid density="compact" rows={rows} columns={cols} disableRowSelectionOnClick/>
    </div>);
}
