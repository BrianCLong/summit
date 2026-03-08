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
const react_query_1 = require("@tanstack/react-query");
const axios_1 = __importDefault(require("axios"));
async function getJSON(url) {
    const res = await axios_1.default.get(url, { headers: { Accept: 'application/json' } });
    return res.data;
}
const formatPercent = (value) => `${(value * 100).toFixed(2)}%`;
const metricLabels = {
    tpr_gap: 'TPR Gap',
    fpr_gap: 'FPR Gap',
    demographic_parity_diff: 'Demographic Parity Diff',
    eq_opp_at_k_diff: 'Equality of Opportunity @k Diff'
};
const metricOrder = ['tpr_gap', 'fpr_gap', 'demographic_parity_diff', 'eq_opp_at_k_diff'];
const badgeClass = (value) => {
    if (value < 0.05)
        return 'badge badge--good';
    if (value < 0.1)
        return 'badge badge--warn';
    return 'badge badge--bad';
};
const AlertsPanel = ({ alerts }) => {
    if (!alerts || alerts.length === 0) {
        return (<section className="panel">
        <h2>Alerts</h2>
        <p className="empty">No fairness alerts in the active window.</p>
      </section>);
    }
    return (<section className="panel">
      <h2>Alerts</h2>
      <ul className="alert-list">
        {alerts.map((alert, idx) => (<li key={`${alert.metric}-${idx}`}>
            <header>
              <span className="metric-name">{metricLabels[alert.metric] ?? alert.metric}</span>
              <span className="badge badge--bad">{formatPercent(alert.value)} &gt; {formatPercent(alert.threshold)}</span>
            </header>
            <div className="alert-body">
              <div>
                <strong>Window:</strong> {alert.explanation?.window ?? alert.window_end}
              </div>
              <div>
                <strong>Groups:</strong> {alert.groups.join(', ')}
              </div>
              {alert.slices && alert.slices.length > 0 && (<div>
                  <strong>Slices:</strong> {alert.slices.join(', ')}
                </div>)}
            </div>
          </li>))}
      </ul>
    </section>);
};
const MetricsPanel = ({ snapshot }) => {
    if (!snapshot) {
        return (<section className="panel">
        <h2>Window Metrics</h2>
        <p className="empty">Waiting for first event...</p>
      </section>);
    }
    return (<section className="panel">
      <h2>Window Metrics</h2>
      <div className="window-range">{snapshot.window_start} → {snapshot.window_end}</div>
      <div className="metrics-grid">
        {metricOrder.map((key) => (<div key={key} className={`metric-card ${badgeClass(snapshot[key])}`}>
            <span className="metric-label">{metricLabels[key]}</span>
            <span className="metric-value">{formatPercent(snapshot[key])}</span>
          </div>))}
      </div>
      <table className="metrics-table">
        <thead>
          <tr>
            <th>Group</th>
            <th>Support</th>
            <th>TPR</th>
            <th>FPR</th>
            <th>Positive Rate</th>
            <th>Eq. Opp @k</th>
          </tr>
        </thead>
        <tbody>
          {snapshot.group_metrics.map((group) => (<tr key={group.group}>
              <td>{group.group}</td>
              <td>{group.support}</td>
              <td>{formatPercent(group.tpr)}</td>
              <td>{formatPercent(group.fpr)}</td>
              <td>{formatPercent(group.positive_rate)}</td>
              <td>{formatPercent(group.top_k_rate)}</td>
            </tr>))}
        </tbody>
      </table>
    </section>);
};
const SnapshotPanel = ({ onMint, status, signature }) => {
    return (<section className="panel">
      <h2>Snapshot</h2>
      <p>Create a signed fairness snapshot for audit/replay.</p>
      <button className="primary" onClick={onMint}>Mint Snapshot</button>
      <div className="status">{status}</div>
      {signature && (<code className="signature">{signature}</code>)}
    </section>);
};
const ReplayPanel = ({ onReplay, status }) => {
    const [path, setPath] = (0, react_1.useState)('');
    return (<section className="panel">
      <h2>Deterministic Replay</h2>
      <form onSubmit={(event) => {
            event.preventDefault();
            if (!path)
                return;
            void onReplay({ path });
        }}>
        <label>
          Parquet Path
          <input value={path} onChange={(event) => setPath(event.target.value)} placeholder="/data/replay.parquet"/>
        </label>
        <button className="secondary" type="submit">Replay</button>
      </form>
      <div className="status">{status}</div>
    </section>);
};
const App = () => {
    const client = (0, react_query_1.useQueryClient)();
    const [signature, setSignature] = (0, react_1.useState)();
    const metricsQuery = (0, react_query_1.useQuery)({ queryKey: ['metrics'], queryFn: () => getJSON('/metrics') });
    const alertsQuery = (0, react_query_1.useQuery)({ queryKey: ['alerts'], queryFn: () => getJSON('/alerts') });
    const mintMutation = (0, react_query_1.useMutation)({
        mutationFn: async () => {
            const res = await axios_1.default.post('/snapshots', {});
            return res.data;
        },
        onSuccess: (envelope) => {
            setSignature(envelope.signature);
        }
    });
    const replayMutation = (0, react_query_1.useMutation)({
        mutationFn: async (req) => {
            await axios_1.default.post('/replay', req);
        },
        onSuccess: () => {
            void client.invalidateQueries({ queryKey: ['metrics'] });
            void client.invalidateQueries({ queryKey: ['alerts'] });
        }
    });
    const snapshotStatus = (0, react_1.useMemo)(() => {
        if (mintMutation.isPending)
            return 'Minting snapshot...';
        if (mintMutation.isError)
            return mintMutation.error.message;
        if (mintMutation.isSuccess)
            return 'Snapshot minted';
        return 'Idle';
    }, [mintMutation.isPending, mintMutation.isError, mintMutation.isSuccess, mintMutation.error]);
    const replayStatus = (0, react_1.useMemo)(() => {
        if (replayMutation.isPending)
            return 'Replaying parquet...';
        if (replayMutation.isError)
            return replayMutation.error.message;
        if (replayMutation.isSuccess)
            return 'Replay complete';
        return 'Idle';
    }, [replayMutation.isPending, replayMutation.isError, replayMutation.isSuccess, replayMutation.error]);
    return (<div className="app">
      <header>
        <h1>Streaming Fairness Monitor</h1>
        <p>Real-time fairness telemetry across demographic slices.</p>
      </header>
      <main>
        <MetricsPanel snapshot={metricsQuery.data}/>
        <AlertsPanel alerts={alertsQuery.data}/>
        <div className="panel-grid">
          <SnapshotPanel onMint={() => mintMutation.mutateAsync()} status={snapshotStatus} signature={signature}/>
          <ReplayPanel onReplay={(req) => replayMutation.mutateAsync(req)} status={replayStatus}/>
        </div>
      </main>
    </div>);
};
exports.default = App;
