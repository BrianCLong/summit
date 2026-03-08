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
exports.default = PerfFixtureRoute;
const react_1 = __importStar(require("react"));
const VirtualizedListTable_1 = __importDefault(require("../components/common/VirtualizedListTable"));
const useDebouncedValue_1 = require("../hooks/useDebouncedValue");
const usePerfMarkers_1 = require("../hooks/usePerfMarkers");
const useFeatureFlag_1 = require("../hooks/useFeatureFlag");
const STATUSES = ['open', 'in-progress', 'closed', 'triage'];
function buildRows(count) {
    const now = Date.now();
    return Array.from({ length: count }, (_, i) => ({
        id: `row-${i}`,
        name: `Synthetic Case ${i.toString().padStart(4, '0')}`,
        status: STATUSES[i % STATUSES.length],
        score: (i % 101) / 100,
        updatedAt: new Date(now - i * 1000 * 7).toISOString(),
    }));
}
function PerfFixtureRoute() {
    const [search, setSearch] = (0, react_1.useState)('');
    const [rowCount, setRowCount] = (0, react_1.useState)(10_000);
    const debouncedSearch = (0, useDebouncedValue_1.useDebouncedValue)(search, 120);
    const virtualListsEnabled = (0, useFeatureFlag_1.useFeatureFlag)('ui.virtualLists');
    const devFixtureEnabled = (0, useFeatureFlag_1.useFeatureFlag)('ui.virtualLists.devFixture');
    const virtualized = !!(virtualListsEnabled?.enabled || devFixtureEnabled?.enabled);
    const { mark, overlayState } = (0, usePerfMarkers_1.usePerfMarkers)('perf-fixture', virtualized);
    const rows = (0, react_1.useMemo)(() => buildRows(rowCount), [rowCount]);
    const filteredRows = (0, react_1.useMemo)(() => {
        if (!debouncedSearch)
            return rows;
        const term = debouncedSearch.toLowerCase();
        return rows.filter((row) => row.name.toLowerCase().includes(term) ||
            row.status.toLowerCase().includes(term) ||
            row.id.toLowerCase().includes(term));
    }, [debouncedSearch, rows]);
    (0, react_1.useEffect)(() => {
        const done = mark('rows');
        return done;
    }, [filteredRows, mark, rowCount]);
    const columns = (0, react_1.useMemo)(() => [
        { key: 'name', label: 'Name', width: '2fr', render: (r) => r.name },
        { key: 'status', label: 'Status', width: '1fr', render: (r) => r.status },
        {
            key: 'score',
            label: 'Score',
            width: '1fr',
            render: (r) => `${Math.round(r.score * 100)}%`,
        },
        {
            key: 'updated',
            label: 'Updated',
            width: '1.4fr',
            render: (r) => new Date(r.updatedAt).toLocaleString(),
        },
    ], []);
    return (<div className="space-y-3 p-4">
      <h2 className="text-xl font-semibold">Performance Fixture (dev)</h2>
      <p className="text-sm text-gray-600">
        Synthetic list sized for virtualization + debounced filtering. Toggle feature flags to compare behavior.
      </p>

      <div className="flex items-center gap-3 text-sm">
        <label className="flex items-center gap-1">
          Rows:
          <input type="number" min={1000} max={25000} value={rowCount} onChange={(e) => setRowCount(Number(e.target.value) || 0)} className="border px-2 py-1 rounded w-24"/>
        </label>
        <input placeholder="Filter rows..." className="border px-2 py-1 rounded w-72" value={search} onChange={(e) => setSearch(e.target.value)}/>
        <span className="opacity-70">
          Virtualized: {virtualized ? 'on' : 'off'} | {filteredRows.length} rows
        </span>
      </div>

      <VirtualizedListTable_1.default ariaLabel="Performance fixture table" items={filteredRows} columns={columns} height={520} rowHeight={48} virtualizationEnabled={virtualized} overscan={10} getRowId={(r) => r.id}/>

      <usePerfMarkers_1.PerfMarkOverlay label="Perf Fixture" state={overlayState} show={import.meta.env.DEV && virtualized}/>
    </div>);
}
