"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = WorkBoard;
// @ts-nocheck - React 18/19 type compatibility with react-router-dom
const react_1 = __importDefault(require("react"));
const react_router_dom_1 = require("react-router-dom");
function WorkBoard() {
    const [tickets, setTickets] = react_1.default.useState([]);
    const [loading, setLoading] = react_1.default.useState(true);
    const [provider, setProvider] = react_1.default.useState('');
    const [assignee, setAssignee] = react_1.default.useState('');
    const [label, setLabel] = react_1.default.useState('');
    const [project, setProject] = react_1.default.useState('');
    const [repo, setRepo] = react_1.default.useState('');
    const load = react_1.default.useCallback(() => {
        setLoading(true);
        const params = new URLSearchParams();
        if (provider)
            params.set('provider', provider);
        if (assignee)
            params.set('assignee', assignee);
        if (label)
            params.set('label', label);
        if (project)
            params.set('project', project);
        if (repo)
            params.set('repo', repo);
        fetch(`/api/tickets?${params.toString()}`)
            .then((r) => r.json())
            .then((data) => setTickets(data.items || []))
            .finally(() => setLoading(false));
    }, [provider, assignee, label, project, repo]);
    react_1.default.useEffect(() => {
        load();
    }, [load]);
    return (<div style={{ padding: 24 }}>
      <h2>Work Board (GitHub + Jira)</h2>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <select value={provider} onChange={(e) => setProvider(e.target.value)}>
          <option value="">All</option>
          <option value="github">GitHub</option>
          <option value="jira">Jira</option>
        </select>
        <input placeholder="Assignee" value={assignee} onChange={(e) => setAssignee(e.target.value)}/>
        <input placeholder="Label" value={label} onChange={(e) => setLabel(e.target.value)}/>
        <input placeholder="Project" value={project} onChange={(e) => setProject(e.target.value)}/>
        <input placeholder="Repo" value={repo} onChange={(e) => setRepo(e.target.value)}/>
        <button onClick={load}>Filter</button>
      </div>
      {loading ? (<p>Loading…</p>) : (<ul>
          {tickets.map((t) => (<li key={`${t.provider}:${t.id}`}>
              <strong>[{t.provider ?? 'pm'}]</strong>{' '}
              <react_router_dom_1.Link to={`/work/ticket?provider=${encodeURIComponent(t.provider || 'pm')}&id=${encodeURIComponent(t.external_id || t.id)}`}>
                {t.title}
              </react_router_dom_1.Link>{' '}
              — {t.status} {t.assignee ? `· ${t.assignee}` : ''}
            </li>))}
        </ul>)}
      {!loading && tickets.length === 0 && <p>No tickets yet.</p>}
    </div>);
}
