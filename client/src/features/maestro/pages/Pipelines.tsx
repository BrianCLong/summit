// @ts-nocheck
import React from 'react';
import { AutoSizer, List, ListRowRenderer } from 'react-virtualized';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { pipelineRecords, PipelineRecord } from '../mockData';
import { useDebouncedValue } from '../hooks/useMaestroHooks';

function StatusPill({ status }: { status: PipelineRecord['status'] }) {
  const map: Record<PipelineRecord['status'], string> = {
    healthy: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    degraded: 'bg-amber-500/20 text-amber-200 border-amber-500/40',
    failed: 'bg-red-500/20 text-red-200 border-red-500/40',
  };
  return (
    <span
      className={`rounded-full border px-3 py-1 text-xs font-medium ${map[status]}`}
    >
      {status}
    </span>
  );
}

export function PipelinesPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = React.useState(params.get('q') ?? '');
  const [ownerFilter, setOwnerFilter] = React.useState(
    params.get('owner') ?? '',
  );
  const debouncedSearch = useDebouncedValue(search, 150);
  const debouncedOwner = useDebouncedValue(ownerFilter, 150);
  const [filtered, setFiltered] =
    React.useState<PipelineRecord[]>(pipelineRecords);

  React.useEffect(() => {
    const query = new URLSearchParams(params);
    if (search) query.set('q', search);
    else query.delete('q');
    if (ownerFilter) query.set('owner', ownerFilter);
    else query.delete('owner');
    setParams(query, { replace: true });
  }, [search, ownerFilter, params, setParams]);

  React.useEffect(() => {
    const q = debouncedSearch.trim().toLowerCase();
    const owner = debouncedOwner.trim().toLowerCase();
    setFiltered(
      pipelineRecords.filter((pipeline) => {
        const matchName = !q || pipeline.name.toLowerCase().includes(q);
        const matchOwner =
          !owner ||
          pipeline.owners.some((candidate) =>
            candidate.toLowerCase().includes(owner),
          );
        return matchName && matchOwner;
      }),
    );
  }, [debouncedOwner, debouncedSearch]);

  const rowRenderer: ListRowRenderer = ({ index, key, style }: any) => {
    const pipeline = filtered[index];
    if (!pipeline) return null;
    return (
      <button
        key={key}
        type="button"
        style={style}
        onClick={() => navigate(`/pipelines/${pipeline.id}`)}
        className="flex w-full items-center gap-6 border-b border-slate-800/60 bg-slate-900/50 px-4 py-3 text-left text-sm text-slate-200 transition hover:bg-slate-800/60 focus-visible:outline focus-visible:outline-emerald-400"
      >
        <div className="flex-1">
          <p className="font-semibold text-white">{pipeline.name}</p>
          <p className="text-xs text-slate-400">
            Owners: {pipeline.owners.join(', ')}
          </p>
        </div>
        <StatusPill status={pipeline.status} />
        <div className="w-28 text-xs text-slate-300">
          <p className="font-mono">
            {new Date(pipeline.lastRun).toLocaleString()}
          </p>
          <p>Lead time: {pipeline.leadTimeMinutes}m</p>
        </div>
        <div className="w-24 text-xs text-slate-300">
          <p>DF: {pipeline.dora.deploymentFrequency}/week</p>
          <p>CFR: {pipeline.dora.changeFailureRate}%</p>
        </div>
        <div className="w-24 text-xs text-emerald-300">
          ${pipeline.costPerRun.toFixed(2)}
        </div>
        <div className="w-16 text-xs text-slate-300">
          Queue {pipeline.queueDepth}
        </div>
      </button>
    );
  };

  return (
    <div className="flex h-full flex-col gap-4">
      <header>
        <h1 className="text-2xl font-semibold text-white">Pipelines</h1>
        <p className="mt-1 text-sm text-slate-400">
          Virtualized list of {filtered.length} pipelines. Filters debounce
          within 150ms and sync to the query string.
        </p>
      </header>
      <div className="flex flex-wrap gap-3">
        <label className="flex flex-1 min-w-[240px] flex-col text-xs text-slate-300">
          Search
          <input
            className="mt-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus-visible:outline focus-visible:outline-emerald-400"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Name"
          />
        </label>
        <label className="flex w-56 flex-col text-xs text-slate-300">
          Owner
          <input
            className="mt-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus-visible:outline focus-visible:outline-emerald-400"
            value={ownerFilter}
            onChange={(event) => setOwnerFilter(event.target.value)}
            placeholder="devon"
          />
        </label>
      </div>
      <div className="flex-1 overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/60">
        <div className="grid grid-cols-[2fr_auto_auto_auto_auto_auto] gap-6 border-b border-slate-800/80 bg-slate-900/80 px-4 py-2 text-xs uppercase tracking-wide text-slate-400">
          <span>Name</span>
          <span>Status</span>
          <span>Last run</span>
          <span>DORA</span>
          <span>Cost/run</span>
          <span>Queue</span>
        </div>
        <AutoSizer disableHeight>
          {({ width }: any) => (
            <List
              width={width}
              height={520}
              rowCount={filtered.length}
              rowHeight={92}
              rowRenderer={rowRenderer}
              overscanRowCount={6}
            />
          )}
        </AutoSizer>
      </div>
    </div>
  );
}

export default PipelinesPage;
