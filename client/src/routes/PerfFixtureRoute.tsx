import React, { useEffect, useMemo, useState } from 'react';
import VirtualizedListTable from '../components/common/VirtualizedListTable';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { usePerfMarkers, PerfMarkOverlay } from '../hooks/usePerfMarkers';
import { useFeatureFlag } from '../hooks/useFeatureFlag';

type PerfRow = {
  id: string;
  name: string;
  status: string;
  score: number;
  updatedAt: string;
};

const STATUSES = ['open', 'in-progress', 'closed', 'triage'];

function buildRows(count: number): PerfRow[] {
  const now = Date.now();
  return Array.from({ length: count }, (_, i) => ({
    id: `row-${i}`,
    name: `Synthetic Case ${i.toString().padStart(4, '0')}`,
    status: STATUSES[i % STATUSES.length],
    score: (i % 101) / 100,
    updatedAt: new Date(now - i * 1000 * 7).toISOString(),
  }));
}

export default function PerfFixtureRoute() {
  const [search, setSearch] = useState('');
  const [rowCount, setRowCount] = useState(10_000);
  const debouncedSearch = useDebouncedValue(search, 120);
  const virtualListsEnabled = useFeatureFlag('ui.virtualLists');
  const devFixtureEnabled = useFeatureFlag('ui.virtualLists.devFixture');
  const virtualized = !!(virtualListsEnabled?.enabled || devFixtureEnabled?.enabled);
  const { mark, overlayState } = usePerfMarkers('perf-fixture', virtualized);

  const rows = useMemo(() => buildRows(rowCount), [rowCount]);
  const filteredRows = useMemo(() => {
    if (!debouncedSearch) return rows;
    const term = debouncedSearch.toLowerCase();
    return rows.filter(
      (row) =>
        row.name.toLowerCase().includes(term) ||
        row.status.toLowerCase().includes(term) ||
        row.id.toLowerCase().includes(term),
    );
  }, [debouncedSearch, rows]);

  useEffect(() => {
    const done = mark('rows');
    return done;
  }, [filteredRows, mark, rowCount]);

  const columns = useMemo(
    () => [
      { key: 'name', label: 'Name', width: '2fr', render: (r: PerfRow) => r.name },
      { key: 'status', label: 'Status', width: '1fr', render: (r: PerfRow) => r.status },
      {
        key: 'score',
        label: 'Score',
        width: '1fr',
        render: (r: PerfRow) => `${Math.round(r.score * 100)}%`,
      },
      {
        key: 'updated',
        label: 'Updated',
        width: '1.4fr',
        render: (r: PerfRow) => new Date(r.updatedAt).toLocaleString(),
      },
    ],
    [],
  );

  return (
    <div className="space-y-3 p-4">
      <h2 className="text-xl font-semibold">Performance Fixture (dev)</h2>
      <p className="text-sm text-gray-600">
        Synthetic list sized for virtualization + debounced filtering. Toggle feature flags to compare behavior.
      </p>

      <div className="flex items-center gap-3 text-sm">
        <label className="flex items-center gap-1">
          Rows:
          <input
            type="number"
            min={1000}
            max={25000}
            value={rowCount}
            onChange={(e) => setRowCount(Number(e.target.value) || 0)}
            className="border px-2 py-1 rounded w-24"
          />
        </label>
        <input
          placeholder="Filter rows..."
          className="border px-2 py-1 rounded w-72"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <span className="opacity-70">
          Virtualized: {virtualized ? 'on' : 'off'} | {filteredRows.length} rows
        </span>
      </div>

      <VirtualizedListTable
        ariaLabel="Performance fixture table"
        items={filteredRows}
        columns={columns}
        height={520}
        rowHeight={48}
        virtualizationEnabled={virtualized}
        overscan={10}
        getRowId={(r: PerfRow) => r.id}
      />

      <PerfMarkOverlay
        label="Perf Fixture"
        state={overlayState}
        show={import.meta.env.DEV && virtualized}
      />
    </div>
  );
}
