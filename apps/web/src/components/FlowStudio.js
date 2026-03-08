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
exports.default = FlowStudio;
const react_1 = __importStar(require("react"));
function FlowStudio() {
    const [nodes] = (0, react_1.useState)([
        { id: 'b1', type: 'build', label: 'Build' },
        { id: 't1', type: 'test', label: 'Test' },
        { id: 'd1', type: 'deploy', label: 'Deploy' },
    ]);
    const [edges] = (0, react_1.useState)([
        { from: 'b1', to: 't1' },
        { from: 't1', to: 'd1' },
    ]);
    (0, react_1.useEffect)(() => {
        // TODO: Replace jQuery with React state management
        // $('#q').on('input', function () {
        //   const v = $(this).val()?.toString().toLowerCase() || ''
        //   $('.fs-node').each(function () {
        //     $(this).toggle($(this).text().toLowerCase().includes(v))
        //   })
        // })
    }, [nodes.length]);
    function exportDsl() {
        const dsl = {
            name: 'example',
            triggers: ['pull_request'],
            nodes: nodes.map(n => ({ id: n.id, type: n.type })),
            edges,
            env: { CI: 'true' },
        };
        navigator.clipboard.writeText(JSON.stringify(dsl, null, 2));
        alert('DSL copied to clipboard');
    }
    return (<div className="p-4 rounded-2xl shadow">
      <div className="flex gap-2 mb-3">
        <h3 className="text-lg font-semibold">No-Code Flow Studio</h3>
        <input id="q" className="border rounded px-2 py-1" placeholder="filter nodes…"/>
        <button onClick={exportDsl} className="ml-auto px-3 py-1 rounded-2xl shadow">
          Export DSL
        </button>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {nodes.map(n => (<div key={n.id} className="fs-node p-3 rounded-2xl shadow bg-white">
            <div className="text-sm font-semibold">{n.label}</div>
            <div className="text-xs opacity-70">{n.type}</div>
          </div>))}
      </div>
    </div>);
}
