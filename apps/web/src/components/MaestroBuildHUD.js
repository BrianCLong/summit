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
exports.default = MaestroBuildHUD;
const react_1 = __importStar(require("react"));
const jquery_1 = __importDefault(require("jquery"));
function MaestroBuildHUD({ wsEndpoint = `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/api/buildhub`, className = 'maestro-build-hud', }) {
    const [rows, setRows] = (0, react_1.useState)([]);
    const [connected, setConnected] = (0, react_1.useState)(false);
    const [filter, setFilter] = (0, react_1.useState)('all');
    const [searchTerm, setSearchTerm] = (0, react_1.useState)('');
    (0, react_1.useEffect)(() => {
        let reconnectTimer;
        let ws;
        const connect = () => {
            try {
                ws = new WebSocket(wsEndpoint);
                ws.onopen = () => {
                    setConnected(true);
                    console.log('Maestro Build HUD connected');
                };
                ws.onmessage = event => {
                    try {
                        const buildEvent = JSON.parse(event.data);
                        setRows(prevRows => {
                            const withoutCurrent = prevRows.filter(row => row.sha !== buildEvent.sha);
                            const newRows = [buildEvent, ...withoutCurrent].slice(0, 100);
                            // jQuery DOM flourish: highlight changed row
                            setTimeout(() => {
                                const rowElement = (0, jquery_1.default)(`#row-${buildEvent.sha}`);
                                if (rowElement.length) {
                                    rowElement
                                        .removeClass('animate-highlight')
                                        .addClass('animate-highlight');
                                    setTimeout(() => rowElement.removeClass('animate-highlight'), 2000);
                                }
                            }, 100);
                            return newRows;
                        });
                    }
                    catch (error) {
                        console.error('Failed to parse build event:', error);
                    }
                };
                ws.onclose = () => {
                    setConnected(false);
                    console.log('Maestro Build HUD disconnected');
                    reconnectTimer = setTimeout(connect, 5000);
                };
                ws.onerror = error => {
                    console.error('Maestro Build HUD WebSocket error:', error);
                    setConnected(false);
                };
            }
            catch (error) {
                console.error('Failed to connect to Maestro Build HUD:', error);
                reconnectTimer = setTimeout(connect, 5000);
            }
        };
        connect();
        return () => {
            if (ws && ws.readyState === WebSocket.OPEN) {
                ws.close();
            }
            if (reconnectTimer) {
                clearTimeout(reconnectTimer);
            }
        };
    }, [wsEndpoint]);
    // jQuery-powered filtering and search
    (0, react_1.useEffect)(() => {
        const filterRows = () => {
            (0, jquery_1.default)('.build-row').show();
            // Status filter
            if (filter !== 'all') {
                (0, jquery_1.default)(`.build-row[data-status!='${filter}']`).hide();
            }
            // Search filter
            if (searchTerm.trim()) {
                (0, jquery_1.default)('.build-row').each(function () {
                    const rowText = (0, jquery_1.default)(this).text().toLowerCase();
                    if (!rowText.includes(searchTerm.toLowerCase())) {
                        (0, jquery_1.default)(this).hide();
                    }
                });
            }
        };
        filterRows();
    }, [filter, searchTerm, rows]);
    const getStatusIcon = (status) => {
        switch (status) {
            case 'success':
                return '✅';
            case 'failed':
                return '❌';
            case 'running':
                return '🔄';
            case 'pending':
                return '⏳';
            default:
                return '❓';
        }
    };
    const getStatusColor = (status) => {
        switch (status) {
            case 'success':
                return 'text-green-600';
            case 'failed':
                return 'text-red-600';
            case 'running':
                return 'text-blue-600';
            case 'pending':
                return 'text-yellow-600';
            default:
                return 'text-gray-600';
        }
    };
    const getPolicyColor = (policy) => {
        switch (policy) {
            case 'pass':
                return 'text-green-600';
            case 'warn':
                return 'text-yellow-600';
            case 'fail':
                return 'text-red-600';
            default:
                return 'text-gray-400';
        }
    };
    return (<div className={`${className} bg-white rounded-xl shadow-lg p-6`}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold text-gray-900">
            Maestro Build Plane
          </h2>
          <div className={`w-3 h-3 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} title={connected ? 'Connected' : 'Disconnected'}/>
        </div>

        <div className="flex items-center gap-4">
          <input type="text" placeholder="Search PRs, commits, authors..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="border border-gray-300 rounded-md px-3 py-2 text-sm w-64"/>

          <select value={filter} onChange={e => setFilter(e.target.value)} className="border border-gray-300 rounded-md px-3 py-2 text-sm">
            <option value="all">All Builds</option>
            <option value="success">Success</option>
            <option value="pending">Pending</option>
            <option value="running">Running</option>
            <option value="failed">Failed</option>
          </select>
        </div>
      </div>

      {rows.length === 0 ? (<div className="text-center py-12 text-gray-500">
          <div className="text-4xl mb-4">🏗️</div>
          <p>No builds yet. Waiting for PR activity...</p>
        </div>) : (<div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-gray-700">
                  PR
                </th>
                <th className="px-3 py-2 text-left font-medium text-gray-700">
                  Status
                </th>
                <th className="px-3 py-2 text-left font-medium text-gray-700">
                  SHA
                </th>
                <th className="px-3 py-2 text-left font-medium text-gray-700">
                  Author
                </th>
                <th className="px-3 py-2 text-left font-medium text-gray-700">
                  Policy
                </th>
                <th className="px-3 py-2 text-left font-medium text-gray-700">
                  Signed
                </th>
                <th className="px-3 py-2 text-left font-medium text-gray-700">
                  Tests
                </th>
                <th className="px-3 py-2 text-left font-medium text-gray-700">
                  Preview
                </th>
                <th className="px-3 py-2 text-left font-medium text-gray-700">
                  SBOM
                </th>
                <th className="px-3 py-2 text-left font-medium text-gray-700">
                  Time
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {rows.map(row => (<tr id={`row-${row.sha}`} key={row.sha} className={`build-row hover:bg-gray-50 transition-colors`} data-status={row.status}>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">#{row.pr}</span>
                      {row.title && (<span className="text-xs text-gray-500 truncate max-w-32" title={row.title}>
                          {row.title}
                        </span>)}
                    </div>
                  </td>

                  <td className="px-3 py-3">
                    <div className={`flex items-center gap-2 ${getStatusColor(row.status)}`}>
                      <span>{getStatusIcon(row.status)}</span>
                      <span className="capitalize font-medium">
                        {row.status}
                      </span>
                    </div>
                  </td>

                  <td className="px-3 py-3">
                    <code className="text-xs bg-gray-100 px-2 py-1 rounded font-mono">
                      {row.sha.slice(0, 7)}
                    </code>
                  </td>

                  <td className="px-3 py-3">
                    <span className="text-gray-700">
                      {row.author || 'Unknown'}
                    </span>
                  </td>

                  <td className="px-3 py-3">
                    <span className={`font-medium capitalize ${getPolicyColor(row.policy)}`}>
                      {row.policy || '—'}
                    </span>
                  </td>

                  <td className="px-3 py-3">
                    <span className={row.signed ? 'text-green-600' : 'text-gray-400'}>
                      {row.signed ? '✅' : '❌'}
                    </span>
                  </td>

                  <td className="px-3 py-3">
                    <div className="flex gap-1">
                      <span className={`w-3 h-3 rounded-full ${row.tests?.unit === 'pass'
                    ? 'bg-green-500'
                    : row.tests?.unit === 'fail'
                        ? 'bg-red-500'
                        : 'bg-gray-300'}`} title="Unit Tests"/>
                      <span className={`w-3 h-3 rounded-full ${row.tests?.e2e === 'pass'
                    ? 'bg-green-500'
                    : row.tests?.e2e === 'fail'
                        ? 'bg-red-500'
                        : 'bg-gray-300'}`} title="E2E Tests"/>
                      <span className={`w-3 h-3 rounded-full ${row.tests?.security === 'pass'
                    ? 'bg-green-500'
                    : row.tests?.security === 'fail'
                        ? 'bg-red-500'
                        : 'bg-gray-300'}`} title="Security Scan"/>
                    </div>
                  </td>

                  <td className="px-3 py-3">
                    {row.preview ? (<a href={row.preview} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline text-xs">
                        Open
                      </a>) : (<span className="text-gray-400">—</span>)}
                  </td>

                  <td className="px-3 py-3">
                    {row.sbomUrl ? (<a href={row.sbomUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline text-xs">
                        SPDX
                      </a>) : (<span className="text-gray-400">—</span>)}
                  </td>

                  <td className="px-3 py-3">
                    <span className="text-xs text-gray-500">
                      {new Date(row.timestamp).toLocaleTimeString()}
                    </span>
                  </td>
                </tr>))}
            </tbody>
          </table>
        </div>)}

      <style>{`
        .animate-highlight {
          animation: highlight 2s ease-in-out;
        }

        @keyframes highlight {
          0% {
            background-color: rgba(59, 130, 246, 0.1);
          }
          50% {
            background-color: rgba(59, 130, 246, 0.3);
          }
          100% {
            background-color: transparent;
          }
        }
      `}</style>
    </div>);
}
