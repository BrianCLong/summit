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
exports.default = CommandPalette;
const react_1 = __importStar(require("react"));
function CommandPalette() {
    const [open, setOpen] = (0, react_1.useState)(false);
    const [q, setQ] = (0, react_1.useState)('');
    const [selectedIndex, setSelectedIndex] = (0, react_1.useState)(0);
    const inputRef = (0, react_1.useRef)(null);
    const listRef = (0, react_1.useRef)(null);
    (0, react_1.useEffect)(() => {
        setSelectedIndex(0);
    }, [q, open]);
    (0, react_1.useEffect)(() => {
        if (open && listRef.current) {
            const el = listRef.current.children[selectedIndex];
            if (el) {
                el.scrollIntoView({ block: 'nearest' });
            }
        }
    }, [selectedIndex, open]);
    (0, react_1.useEffect)(() => {
        const h = (e) => {
            if ((e.ctrlKey || e.metaKey) &&
                e.shiftKey &&
                e.key.toLowerCase() === 'p') {
                e.preventDefault();
                setOpen(true);
                setTimeout(() => inputRef.current?.focus(), 0);
            }
            if (e.key === 'Escape') {
                setOpen(false);
            }
        };
        window.addEventListener('keydown', h);
        return () => window.removeEventListener('keydown', h);
    }, []);
    const items = (0, react_1.useMemo)(() => [
        {
            id: 'open-copilot',
            label: 'Open Copilot',
            action: () => {
                window.dispatchEvent(new CustomEvent('open-copilot'));
                setOpen(false);
            },
        },
        {
            id: 'run-copilot-nl2',
            label: 'Run Copilot (nl2cypher)',
            action: () => {
                window.dispatchEvent(new CustomEvent('copilot:run', { detail: { mode: 'nl2cypher' } }));
                setOpen(false);
            },
        },
        {
            id: 'run-copilot-ask',
            label: 'Run Copilot (ask)',
            action: () => {
                window.dispatchEvent(new CustomEvent('copilot:run', { detail: { mode: 'ask' } }));
                setOpen(false);
            },
        },
    ], []);
    const filtered = items.filter((i) => i.label.toLowerCase().includes(q.toLowerCase()));
    const handleKeyDown = (e) => {
        if (filtered.length === 0)
            return;
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex((prev) => (prev + 1) % filtered.length);
        }
        else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex((prev) => (prev - 1 + filtered.length) % filtered.length);
        }
        else if (e.key === 'Enter') {
            e.preventDefault();
            if (filtered[selectedIndex]) {
                filtered[selectedIndex].action();
            }
        }
    };
    if (!open)
        return null;
    return (<div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.3)',
            zIndex: 9999,
        }} onClick={() => setOpen(false)}>
      <div style={{
            maxWidth: 600,
            margin: '10% auto',
            background: '#fff',
            borderRadius: 8,
            boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
        }} onClick={(e) => e.stopPropagation()}>
        <div style={{ padding: 12, borderBottom: '1px solid #eee' }}>
          <input ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={handleKeyDown} placeholder="Type a command (Open Copilot)…" aria-activedescendant={filtered[selectedIndex]?.id} aria-controls="command-palette-list" aria-autocomplete="list" role="combobox" aria-expanded={true} style={{
            width: '100%',
            fontSize: 16,
            padding: 8,
            outline: 'none',
            border: 'none',
        }}/>
        </div>
        <ul ref={listRef} id="command-palette-list" role="listbox" style={{
            listStyle: 'none',
            margin: 0,
            padding: 0,
            maxHeight: 300,
            overflowY: 'auto',
        }}>
          {filtered.map((it, index) => (<li key={it.id} id={it.id} role="option" aria-selected={index === selectedIndex} style={{
                padding: '10px 12px',
                borderTop: '1px solid #f4f4f4',
                cursor: 'pointer',
                background: index === selectedIndex ? '#f0f0f0' : 'transparent',
            }} onClick={it.action}>
              {it.label}
            </li>))}
          {!filtered.length && (<li style={{ padding: '10px 12px', color: '#888' }}>No matches</li>)}
        </ul>
      </div>
    </div>);
}
