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
exports.default = CICD;
const react_1 = __importStar(require("react"));
const CiSummary_1 = __importDefault(require("../components/CiSummary"));
const Refresh_1 = __importDefault(require("@mui/icons-material/Refresh"));
const material_1 = require("@mui/material");
const recharts_1 = require("recharts");
const api_1 = require("../api");
function setQuery(params) {
    const url = new URL(location.href);
    Object.entries(params).forEach(([k, v]) => {
        if (v === undefined || v === '')
            url.searchParams.delete(k);
        else
            url.searchParams.set(k, String(v));
    });
    history.replaceState(null, '', `${url.pathname}${url.search}${location.hash}`);
}
function CICD() {
    const { getCIAnnotationsGlobal } = (0, api_1.api)();
    const url = new URL(location.href);
    const [level, setLevel] = (0, react_1.useState)(url.searchParams.get('level') || 'all');
    const [repo, setRepo] = (0, react_1.useState)(url.searchParams.get('repo') || '');
    const [since, setSince] = (0, react_1.useState)(Number(url.searchParams.get('since') || 24 * 3600 * 1000));
    const [rows, setRows] = (0, react_1.useState)([]);
    const [loading, setLoading] = (0, react_1.useState)(false);
    const [trends, setTrends] = (0, react_1.useState)([]);
    const refresh = () => {
        setLoading(true);
        getCIAnnotationsGlobal({
            sinceMs: since,
            level: level === 'all' ? undefined : level,
            repo: repo || undefined,
        })
            .then((r) => setRows(r.annotations || []))
            .finally(() => setLoading(false));
    };
    (0, react_1.useEffect)(() => {
        setQuery({ level, repo, since });
        refresh();
        // fetch trends
        (async () => {
            try {
                const r = await (0, api_1.api)().getCITrends({
                    sinceMs: since,
                    stepMs: 60 * 60 * 1000,
                });
                setTrends((r.buckets || []).map((b) => ({
                    time: new Date(b.ts).toLocaleTimeString(),
                    ...b,
                })));
            }
            catch { }
        })();
    }, [level, repo, since]);
    const link = (a) => a.url
        ? a.url
        : a.repo && a.sha
            ? `https://github.com/${a.repo}/commit/${a.sha}`
            : undefined;
    const pathCol = (a) => a.path ? `${a.path}${a.startLine ? `:${a.startLine}` : ''}` : '-';
    return (<section className="space-y-3 p-4" aria-label="CICD annotations">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">CI Annotations</h1>
        <material_1.IconButton aria-label="Refresh" onClick={refresh} disabled={loading}>
          <Refresh_1.default />
        </material_1.IconButton>
      </div>

      <CiSummary_1.default annotations={rows}/>
      <div className="rounded-2xl border p-3">
        <div className="mb-2 text-sm text-gray-600">CI annotations trend</div>
        <div style={{ height: 220 }}>
          <recharts_1.ResponsiveContainer>
            <recharts_1.AreaChart data={trends}>
              <recharts_1.XAxis dataKey="time" hide/>
              <recharts_1.YAxis allowDecimals={false}/>
              <recharts_1.Tooltip />
              <recharts_1.Legend />
              <recharts_1.Area dataKey="failure" name="Failures"/>
              <recharts_1.Area dataKey="warning" name="Warnings"/>
              <recharts_1.Area dataKey="notice" name="Notices"/>
            </recharts_1.AreaChart>
          </recharts_1.ResponsiveContainer>
        </div>
      </div>

      <div className="flex items-end gap-3">
        <material_1.Select value={level} onChange={(e) => setLevel(e.target.value)} size="small" aria-label="Level filter">
          <material_1.MenuItem value="all">All</material_1.MenuItem>
          <material_1.MenuItem value="notice">Notice</material_1.MenuItem>
          <material_1.MenuItem value="warning">Warning</material_1.MenuItem>
          <material_1.MenuItem value="failure">Failure</material_1.MenuItem>
        </material_1.Select>
        <material_1.TextField size="small" label="Repo (owner/name)" value={repo} onChange={(e) => setRepo(e.target.value)}/>
        <material_1.Select value={since} onChange={(e) => setSince(Number(e.target.value))} size="small" aria-label="Since filter">
          <material_1.MenuItem value={3600000}>Last 1h</material_1.MenuItem>
          <material_1.MenuItem value={6 * 3600000}>Last 6h</material_1.MenuItem>
          <material_1.MenuItem value={24 * 3600000}>Last 24h</material_1.MenuItem>
          <material_1.MenuItem value={7 * 24 * 3600000}>Last 7d</material_1.MenuItem>
        </material_1.Select>
      </div>

      <div role="region" aria-live="polite" aria-relevant="additions text">
        <table className="w-full border text-sm">
          <thead>
            <tr>
              <th>Time</th>
              <th>Level</th>
              <th>Repo</th>
              <th>Run</th>
              <th>Path</th>
              <th>Message</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((a) => (<tr key={a.id}>
                <td>{new Date(a.ts).toLocaleString()}</td>
                <td>{a.level}</td>
                <td>{a.repo || '-'}</td>
                <td>
                  <a href={`/maestro/runs/${a.runId}`} className="text-blue-600 underline">
                    {a.runId.slice(0, 8)}
                  </a>
                </td>
                <td>{pathCol(a)}</td>
                <td>
                  {link(a) ? (<a href={link(a)} target="_blank" rel="noreferrer" className="text-blue-600 underline">
                      {a.message}
                    </a>) : (a.message)}
                </td>
              </tr>))}
            {!rows.length && (<tr>
                <td colSpan={6} className="p-4 text-center text-gray-500">
                  {loading ? 'Loading…' : 'No annotations'}
                </td>
              </tr>)}
          </tbody>
        </table>
      </div>
    </section>);
}
