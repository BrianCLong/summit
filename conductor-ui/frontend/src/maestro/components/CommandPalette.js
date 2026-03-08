"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = CommandPalette;
const react_1 = __importDefault(require("react"));
const useFocusTrap_1 = require("../utils/useFocusTrap");
const react_router_dom_1 = require("react-router-dom");
function CommandPalette({ open, onClose, }) {
    const ref = react_1.default.useRef(null);
    (0, useFocusTrap_1.useFocusTrap)(ref, open, onClose);
    const [q, setQ] = react_1.default.useState('');
    const items = [
        { label: 'Go: Home', href: '/maestro/' },
        { label: 'Go: Runs', href: '/maestro/runs' },
        { label: 'Go: Pipelines', href: '/maestro/pipelines' },
        { label: 'Go: Autonomy & Guardrails', href: '/maestro/autonomy' },
        { label: 'Go: Recipes', href: '/maestro/recipes' },
        { label: 'Go: Observability & SLOs', href: '/maestro/observability' },
        { label: 'Go: Costs & Budgets', href: '/maestro/cost' },
        { label: 'Go: CI/CD & Environments', href: '/maestro/cicd' },
        { label: 'Go: Tickets', href: '/maestro/tickets' },
        { label: 'Go: Admin Studio', href: '/maestro/admin' },
    ];
    const filtered = items.filter((i) => i.label.toLowerCase().includes(q.toLowerCase()));
    if (!open)
        return null;
    return (<div role="dialog" aria-modal="true" className="fixed inset-0 z-[100] flex items-start justify-center bg-black/30 pt-24" aria-label="Command palette" onClick={onClose}>
      <div ref={ref} className="w-full max-w-2xl rounded-lg border bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="border-b p-3">
          <input autoFocus aria-label="Command search" className="w-full rounded border px-3 py-2 outline-none" placeholder="Type a command or search (e.g., Runs)" value={q} onChange={(e) => setQ(e.target.value)}/>
        </div>
        <ul className="max-h-[50vh] overflow-auto p-2">
          {filtered.map((i) => (<li key={i.href}>
              <react_router_dom_1.Link className="block rounded px-3 py-2 text-sm hover:bg-slate-100" to={i.href} onClick={onClose}>
                {i.label}
              </react_router_dom_1.Link>
            </li>))}
          {filtered.length === 0 && (<li className="px-3 py-6 text-center text-sm text-slate-500">
              No matches
            </li>)}
        </ul>
        <div className="border-t px-3 py-1 text-[11px] text-slate-500">
          Shortcuts: ⌘K open • g r = Runs • g o = Observability • g t = Tickets
        </div>
      </div>
    </div>);
}
