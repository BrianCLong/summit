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
exports.default = ApprovalsPanel;
const react_1 = __importStar(require("react"));
const jquery_1 = __importDefault(require("jquery"));
function ApprovalsPanel() {
    const [tasks, setTasks] = (0, react_1.useState)([]);
    (0, react_1.useEffect)(() => {
        let alive = true;
        const load = async () => {
            try {
                const r = await fetch('/api/conductor/v1/approvals');
                const j = await r.json();
                if (alive)
                    setTasks(j.items || []);
            }
            catch (e) {
                console.error(e);
            }
        };
        load();
        const iv = setInterval(load, 5000);
        return () => {
            alive = false;
            clearInterval(iv);
        };
    }, []);
    (0, react_1.useEffect)(() => {
        (0, jquery_1.default)(document).on('input', '#approval-filter', function () {
            const q = (0, jquery_1.default)(this).val()?.toString().toLowerCase() || '';
            (0, jquery_1.default)('.approval-row').each(function () {
                (0, jquery_1.default)(this).toggle((0, jquery_1.default)(this).text().toLowerCase().indexOf(q) >= 0);
            });
        });
        return () => {
            (0, jquery_1.default)(document).off('input', '#approval-filter');
        };
    }, []);
    return (<div style={{
            padding: 16,
            borderRadius: 12,
            boxShadow: '0 1px 6px rgba(0,0,0,0.1)',
        }}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        <h3 style={{ margin: 0 }}>Approvals</h3>
        <input id="approval-filter" style={{
            border: '1px solid #ddd',
            borderRadius: 6,
            padding: '4px 8px',
        }} placeholder="filter…"/>
      </div>
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {tasks.map((t) => (<li key={t.runId + t.stepId} className="approval-row" style={{ display: 'flex', gap: 8, padding: '6px 0' }}>
            <div style={{ flexGrow: 1 }}>
              Run {t.runId} • Step {t.stepId} • {(t.labels || []).join(', ')}
            </div>
            <button onClick={() => approve(t, true)} style={{ padding: '4px 8px', borderRadius: 16 }}>
              Approve
            </button>
            <button onClick={() => approve(t, false)} style={{ padding: '4px 8px', borderRadius: 16 }}>
              Decline
            </button>
          </li>))}
      </ul>
    </div>);
    async function approve(t, ok) {
        const justification = window.prompt(ok ? 'Approval justification' : 'Decline justification');
        if (!justification)
            return;
        const m = ok ? 'approveStep' : 'declineStep';
        const q = `mutation($runId:ID!,$stepId:ID!,$j:String!){ ${m}(runId:$runId, stepId:$stepId, justification:$j) }`;
        try {
            await fetch('/graphql', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({
                    query: q,
                    variables: { runId: t.runId, stepId: t.stepId, j: justification },
                }),
            });
        }
        catch (e) {
            console.error(e);
        }
    }
}
