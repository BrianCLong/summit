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
exports.default = IngestWizard;
const react_1 = __importStar(require("react"));
const urls_1 = require("../config/urls");
function IngestWizard() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const api = (0, urls_1.getApiBaseUrl)();
    const [connectors, setConnectors] = (0, react_1.useState)([]);
    const [selected, setSelected] = (0, react_1.useState)('');
    const [config, setConfig] = (0, react_1.useState)('{}');
    const [status, setStatus] = (0, react_1.useState)('');
    const [jobId, setJobId] = (0, react_1.useState)('');
    const [progress, setProgress] = (0, react_1.useState)(null);
    const [schema, setSchema] = (0, react_1.useState)({});
    const [errors, setErrors] = (0, react_1.useState)([]);
    (0, react_1.useEffect)(() => {
        fetch(api + '/ingest/connectors')
            .then((r) => r.json())
            .then((d) => setConnectors(d.items || []))
            .catch(() => setStatus('Connectors API not reachable'));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    async function start() {
        setStatus('');
        setErrors([]);
        try {
            const body = { connector: selected, config: JSON.parse(config || '{}') };
            const res = await fetch(api + '/ingest/start', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify(body),
            });
            const data = await res.json();
            if (data.job_id) {
                setStatus('Started job ' + data.job_id);
                setJobId(data.job_id);
                poll(data.job_id);
            }
            else
                setStatus('Failed to start');
        }
        catch (e) {
            setStatus(String(e));
        }
    }
    async function poll(id) {
        let active = true;
        const tick = async () => {
            if (!active)
                return;
            try {
                const d = await (await fetch(api + '/ingest/progress/' + id)).json();
                setProgress({ status: d.status, progress: d.progress });
                if (d.status === 'completed' || d.status === 'failed')
                    return;
                // eslint-disable-next-line no-empty
            }
            catch { }
            setTimeout(tick, 1000);
        };
        tick();
        return () => {
            active = false;
        };
    }
    async function cancel() {
        if (!jobId)
            return;
        try {
            await fetch(api + '/ingest/cancel/' + jobId, { method: 'POST' });
            setStatus('Canceled job ' + jobId);
            setJobId('');
            setProgress(null);
        }
        catch (e) {
            setStatus(String(e));
        }
    }
    async function onSelectConnector(id) {
        setSelected(id);
        setStatus('');
        setErrors([]);
        setJobId('');
        setProgress(null);
        try {
            const sch = await (await fetch(api + '/ingest/schema/' + id)).json();
            setSchema(sch || {});
            const props = sch?.properties || {};
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const blank = {};
            Object.keys(props).forEach((k) => (blank[k] = ''));
            setConfig(JSON.stringify(blank, null, 2));
        }
        catch {
            setSchema({});
        }
    }
    async function dryRun() {
        setErrors([]);
        setStatus('');
        try {
            const cfg = JSON.parse(config || '{}');
            const res = await fetch(api + '/ingest/dry-run/' + selected, {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify(cfg),
            });
            if (res.ok) {
                setStatus('Dry run passed ✓');
            }
            else {
                const d = await res.json();
                setErrors(d.fields || ['invalid configuration']);
                setStatus('Dry run failed');
            }
        }
        catch (e) {
            setStatus(String(e));
        }
    }
    return (<div style={{ border: '1px solid #ddd', borderRadius: 6, padding: 12 }}>
      <strong>Ingest Wizard</strong>
      <div style={{ marginTop: 8 }}>
        <label>Connector</label>
        <select value={selected} onChange={(e) => onSelectConnector(e.target.value)} style={{ width: '100%', marginTop: 4 }}>
          <option value="">Select…</option>
          {connectors.map((c) => (<option key={c.id} value={c.id}>
              {c.name}
            </option>))}
        </select>
      </div>
      <div style={{ marginTop: 8 }}>
        <label>Config (JSON)</label>
        <textarea rows={5} value={config} onChange={(e) => setConfig(e.target.value)} style={{ width: '100%', fontFamily: 'monospace' }}/>
        {schema?.properties && (<div style={{ marginTop: 8 }}>
            <div style={{ fontWeight: 600, marginBottom: 6 }}>Form</div>
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            {Object.entries(schema.properties).map(([k, meta]) => {
                const cfg = (() => {
                    try {
                        return JSON.parse(config || '{}');
                    }
                    catch {
                        return {};
                    }
                })();
                const val = cfg[k] ?? '';
                const type = meta?.type || 'string';
                const label = meta?.title || k;
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                function onChange(v) {
                    const next = { ...cfg, [k]: v };
                    setConfig(JSON.stringify(next, null, 2));
                }
                if (type === 'boolean')
                    return (<div key={k} style={{ marginBottom: 6 }}>
                    <label>
                      <input type="checkbox" checked={!!val} onChange={(e) => onChange(e.target.checked)}/>{' '}
                      {label}
                    </label>
                  </div>);
                return (<div key={k} style={{ marginBottom: 6 }}>
                  <label>{label}</label>
                  <input style={{ width: '100%' }} type={type === 'number' ? 'number' : 'text'} value={val} onChange={(e) => onChange(type === 'number'
                        ? Number(e.target.value)
                        : e.target.value)}/>
                </div>);
            })}
          </div>)}
        {!!schema?.required?.length && (<div style={{ marginTop: 6, fontSize: 12, color: '#666' }}>
            Required: {schema.required.join(', ')}
          </div>)}
        {!!errors.length && (<div style={{ marginTop: 6, fontSize: 12, color: '#a00' }}>
            Missing: {errors.join(', ')}
          </div>)}
      </div>
      <div style={{ marginTop: 8 }}>
        <button onClick={dryRun} disabled={!selected}>
          Dry Run
        </button>
        <button onClick={start} disabled={!selected} style={{ marginLeft: 8 }}>
          Start Ingest
        </button>
        {jobId && (<button style={{ marginLeft: 8 }} onClick={cancel}>
            Cancel
          </button>)}
        {status && (<div style={{ marginTop: 6, fontSize: 12, color: '#555' }}>
            {status}
          </div>)}
        {progress && (<div style={{ marginTop: 6, fontSize: 12, color: '#555' }}>
            Progress: {progress.progress}% ({progress.status})
          </div>)}
      </div>
    </div>);
}
