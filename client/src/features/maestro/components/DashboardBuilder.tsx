import React from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import {
  addWidget,
  initializeDashboard,
  markSaved,
  moveWidget as moveWidgetAction,
  removeWidget,
  setLayout,
  setName,
  type DashboardWidget,
  type DashboardWidgetPosition,
} from '../../../store/slices/dashboard';
import { useAppDispatch, useAppSelector } from '../../../store/index';
import StatsOverview from '../../../components/dashboard/StatsOverview';
import LatencyPanels from '../../../components/dashboard/LatencyPanels';
import ErrorPanels from '../../../components/dashboard/ErrorPanels';
import ResolverTop5 from '../../../components/dashboard/ResolverTop5';
import LiveActivityFeed from '../../../components/dashboard/LiveActivityFeed';
import GrafanaLinkCard from '../../../components/dashboard/GrafanaLinkCard';
import {
  DASHBOARD_CONFIGURATION_QUERY,
  SAVE_DASHBOARD_CONFIGURATION_MUTATION,
  mapDashboardResponseToState,
  mapStateWidgetToInput,
  type MaestroDashboardConfigurationQuery,
  type MaestroDashboardConfigurationQueryVariables,
  type SaveDashboardConfigurationMutation,
  type SaveDashboardConfigurationMutationVariables,
  type SaveDashboardConfigurationInput,
} from '../graphql/dashboardOperations';

type PaletteItem = {
  type: string;
  title: string;
  description: string;
  icon: string;
  defaults?: Partial<DashboardWidget>;
};

const AVAILABLE_WIDGETS: PaletteItem[] = [
  {
    type: 'graph-summary',
    title: 'Graph Summary',
    description: 'Key metrics for the current knowledge graph.',
    icon: '📈',
    defaults: { refreshInterval: 60 },
  },
  {
    type: 'query-results',
    title: 'Query Results',
    description: 'Showcase curated investigations or saved queries.',
    icon: '🧮',
    defaults: {
      config: {
        rows: [
          { label: 'High-Risk Entities', value: 5 },
          { label: 'Pending Reviews', value: 12 },
        ],
      },
    },
  },
  {
    type: 'ml-insight',
    title: 'ML Insights',
    description: 'Surface predicted hotspots and anomaly warnings.',
    icon: '🤖',
    defaults: {
      config: {
        insights: [
          {
            title: 'Supply Chain Weak Signal',
            confidence: 0.82,
            summary: 'Supplier “Northwind Advanced” trending towards SLA breach.',
          },
        ],
      },
    },
  },
  {
    type: 'latency',
    title: 'Latency Trends',
    description: 'Track p95 latency across orchestrations.',
    icon: '⏱️',
  },
  {
    type: 'error-budget',
    title: 'Error Budgets',
    description: 'Monitor burn rate and failure classes in real time.',
    icon: '🔥',
  },
];

const DEFAULT_WIDGETS: DashboardWidget[] = [
  {
    id: 'default-graph-summary',
    type: 'graph-summary',
    title: 'Graph Summary',
    position: { x: 0, y: 0, w: 4, h: 4 },
    config: null,
    dataSource: null,
    refreshInterval: 60,
  },
  {
    id: 'default-query-results',
    type: 'query-results',
    title: 'Latest Queries',
    position: { x: 0, y: 4, w: 4, h: 4 },
    config: {
      rows: [
        { label: 'Policies requiring attention', value: 3 },
        { label: 'Pending enrichment jobs', value: 5 },
      ],
    },
    dataSource: null,
    refreshInterval: null,
  },
  {
    id: 'default-ml-insight',
    type: 'ml-insight',
    title: 'Predictive Insights',
    position: { x: 0, y: 8, w: 4, h: 4 },
    config: {
      insights: [
        {
          title: 'Anomaly cluster detected',
          confidence: 0.76,
          summary: 'Emerging cluster in executive comms requires review.',
        },
      ],
    },
    dataSource: null,
    refreshInterval: 120,
  },
];

type DraggedWidget = { id: string; index: number };
type PaletteDragItem = { widgetType: string };

function createWidgetFromPalette(item: PaletteItem): Omit<DashboardWidget, 'id' | 'position'> {
  const shared: Omit<DashboardWidget, 'id' | 'position'> = {
    type: item.type,
    title: item.title,
    config: (item.defaults?.config ?? null) as Record<string, unknown> | null,
    dataSource: item.defaults?.dataSource ?? null,
    refreshInterval: item.defaults?.refreshInterval ?? null,
  };

  switch (item.type) {
    case 'graph-summary':
      return shared;
    case 'query-results':
      return {
        ...shared,
        config:
          shared.config ?? {
            rows: [
              { label: 'Investigations Completed', value: 18 },
              { label: 'SSE Alerts Open', value: 4 },
            ],
          },
      };
    case 'ml-insight':
      return {
        ...shared,
        config:
          shared.config ?? {
            insights: [
              {
                title: 'Model drift warning',
                confidence: 0.71,
                summary: 'Embedding divergence detected for analyst classifier.',
              },
            ],
          },
      };
    case 'latency':
      return { ...shared, title: 'Latency Performance' };
    case 'error-budget':
      return { ...shared, title: 'Error Budget Health' };
    default:
      return shared;
  }
}

function WidgetPalette({ onAdd }: { onAdd: (type: string) => void }) {
  return (
    <div className="rounded-2xl border border-slate-800/60 bg-slate-950/60 p-4" aria-label="Widget palette">
      <h2 className="text-sm font-semibold text-slate-200">Available widgets</h2>
      <p className="mt-1 text-xs text-slate-500">Drag to the canvas or click to add.</p>
      <ul className="mt-4 space-y-3">
        {AVAILABLE_WIDGETS.map((widget) => (
          <PaletteWidget key={widget.type} item={widget} onAdd={onAdd} />
        ))}
      </ul>
    </div>
  );
}

function PaletteWidget({ item, onAdd }: { item: PaletteItem; onAdd: (type: string) => void }) {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'palette-widget',
    item: { widgetType: item.type } satisfies PaletteDragItem,
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
  }));

  return (
    <li
      ref={drag}
      data-testid={`palette-item-${item.type}`}
      onClick={() => onAdd(item.type)}
      className={`cursor-move rounded-xl border border-slate-800 bg-slate-900/80 p-3 transition hover:border-emerald-500 hover:shadow-lg ${
        isDragging ? 'opacity-50' : ''
      }`}
    >
      <div className="flex items-start gap-3">
        <span className="text-xl" aria-hidden>
          {item.icon}
        </span>
        <div>
          <p className="text-sm font-semibold text-slate-100">{item.title}</p>
          <p className="mt-1 text-xs text-slate-400">{item.description}</p>
        </div>
      </div>
    </li>
  );
}

function DashboardCanvas({
  children,
  onAddWidget,
}: {
  children: React.ReactNode;
  onAddWidget: (type: string) => void;
}) {
  const [{ isOver, canDrop }, drop] = useDrop(() => ({
    accept: 'palette-widget',
    drop: (item: PaletteDragItem) => {
      onAddWidget(item.widgetType);
    },
    collect: (monitor) => ({ isOver: monitor.isOver(), canDrop: monitor.canDrop() }),
  }));

  return (
    <div
      ref={drop}
      data-testid="dashboard-canvas"
      className={`min-h-[360px] rounded-2xl border border-dashed border-slate-800 bg-slate-950/40 p-4 transition ${
        isOver && canDrop ? 'border-emerald-400 bg-emerald-950/20' : ''
      }`}
      aria-label="Dashboard canvas"
    >
      {children}
    </div>
  );
}

function DashboardWidgetCard({
  widget,
  index,
  onMove,
  onRemove,
}: {
  widget: DashboardWidget;
  index: number;
  onMove: (from: number, to: number) => void;
  onRemove: (id: string) => void;
}) {
  const ref = React.useRef<HTMLDivElement | null>(null);

  const [, drop] = useDrop<DraggedWidget>({
    accept: 'dashboard-widget',
    hover(item, monitor) {
      if (!ref.current) return;
      if (item.index === index) return;
      const bounding = ref.current.getBoundingClientRect();
      const hoverMiddleY = (bounding.bottom - bounding.top) / 2;
      const clientOffset = monitor.getClientOffset();
      if (!clientOffset) return;
      const hoverClientY = clientOffset.y - bounding.top;
      if (item.index < index && hoverClientY < hoverMiddleY) return;
      if (item.index > index && hoverClientY > hoverMiddleY) return;
      onMove(item.index, index);
      item.index = index;
    },
  });

  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'dashboard-widget',
    item: { id: widget.id, index } satisfies DraggedWidget,
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
  }));

  drag(drop(ref));

  return (
    <div
      ref={ref}
      data-testid={`dashboard-widget-${widget.id}`}
      className={`mb-3 rounded-2xl border border-slate-800 bg-slate-900/70 p-4 shadow-lg transition ${
        isDragging ? 'opacity-40' : ''
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-slate-100">{widget.title}</h3>
        <button
          type="button"
          onClick={() => onRemove(widget.id)}
          className="rounded-md border border-transparent px-2 py-1 text-xs text-slate-400 hover:border-rose-500 hover:text-rose-300"
          aria-label={`Remove ${widget.title}`}
        >
          Remove
        </button>
      </div>
      <div className="mt-3 text-sm text-slate-300">
        <WidgetRenderer widget={widget} />
      </div>
    </div>
  );
}

function QueryResultsWidget({ config }: { config?: Record<string, unknown> | null }) {
  const rows = (config?.rows as Array<{ label: string; value: number }> | undefined) ?? [
    { label: 'No data available', value: 0 },
  ];

  return (
    <table className="w-full table-fixed" aria-label="Query results">
      <tbody>
        {rows.map((row) => (
          <tr key={row.label} className="border-b border-slate-800/60 last:border-b-0">
            <td className="py-1 text-slate-400">{row.label}</td>
            <td className="py-1 text-right font-semibold text-emerald-300">{row.value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function MlInsightsWidget({ config }: { config?: Record<string, unknown> | null }) {
  const insights = (config?.insights as Array<{ title: string; summary: string; confidence?: number }> | undefined) ?? [
    { title: 'No ML insight available', summary: 'Connect data sources to unlock insights.' },
  ];

  return (
    <ul className="space-y-2" aria-label="ML insights">
      {insights.map((insight) => (
        <li key={insight.title} className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3">
          <p className="text-sm font-semibold text-emerald-200">{insight.title}</p>
          <p className="mt-1 text-xs text-slate-300">{insight.summary}</p>
          {typeof insight.confidence === 'number' ? (
            <p className="mt-1 text-xs text-emerald-400">Confidence {(insight.confidence * 100).toFixed(0)}%</p>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

function WidgetRenderer({ widget }: { widget: DashboardWidget }) {
  switch (widget.type) {
    case 'graph-summary':
      return <StatsOverview />;
    case 'query-results':
      return <QueryResultsWidget config={widget.config} />;
    case 'ml-insight':
      return <MlInsightsWidget config={widget.config} />;
    case 'latency':
      return <LatencyPanels />;
    case 'error-budget':
      return <ErrorPanels />;
    case 'resolver-top':
      return <ResolverTop5 />;
    case 'activity-feed':
      return <LiveActivityFeed />;
    case 'grafana-link':
      return <GrafanaLinkCard />;
    default:
      return <p className="text-xs text-slate-500">Widget renderer not implemented.</p>;
  }
}

export function DashboardBuilder({ dashboardId }: { dashboardId?: string | null }) {
  const dispatch = useAppDispatch();
  const widgets = useAppSelector((state) => state.dashboard.widgets);
  const layout = useAppSelector((state) => state.dashboard.layout);
  const name = useAppSelector((state) => state.dashboard.name);
  const dirty = useAppSelector((state) => state.dashboard.dirty);
  const persistedId = useAppSelector((state) => state.dashboard.persistedId);
  const lastSavedAt = useAppSelector((state) => state.dashboard.lastSavedAt);

  const hasInitialized = React.useRef(false);
  const [feedback, setFeedback] = React.useState<string | null>(null);

  const queryResult = useQuery<
    MaestroDashboardConfigurationQuery,
    MaestroDashboardConfigurationQueryVariables
  >(DASHBOARD_CONFIGURATION_QUERY, {
    variables: dashboardId ? { id: dashboardId } : {},
    fetchPolicy: 'cache-first',
  });

  const [saveDashboard, saveState] = useMutation<
    SaveDashboardConfigurationMutation,
    SaveDashboardConfigurationMutationVariables
  >(SAVE_DASHBOARD_CONFIGURATION_MUTATION);

  React.useEffect(() => {
    if (hasInitialized.current) return;
    if (queryResult.loading) return;
    if (queryResult.data?.dashboardConfiguration) {
      dispatch(initializeDashboard(mapDashboardResponseToState(queryResult.data.dashboardConfiguration)));
      hasInitialized.current = true;
    } else if (!queryResult.loading && !queryResult.error) {
      dispatch(
        initializeDashboard({
          id: dashboardId ?? null,
          name: 'Command Center Dashboard',
          description: 'Adaptive workspace with analyst context.',
          layout: 'grid',
          widgets: DEFAULT_WIDGETS,
          settings: { version: 1 },
          updatedAt: null,
        }),
      );
      hasInitialized.current = true;
    }
  }, [dashboardId, dispatch, queryResult.data, queryResult.error, queryResult.loading]);

  React.useEffect(() => {
    if (!queryResult.error || hasInitialized.current) {
      return;
    }
    dispatch(
      initializeDashboard({
        id: dashboardId ?? null,
        name: 'Command Center Dashboard',
        description: 'Adaptive workspace with analyst context.',
        layout: 'grid',
        widgets: DEFAULT_WIDGETS,
        settings: { version: 1 },
        updatedAt: null,
      }),
    );
    hasInitialized.current = true;
    setFeedback('Loaded default dashboard layout');
  }, [dashboardId, dispatch, queryResult.error]);

  const handleAddWidget = React.useCallback(
    (type: string) => {
      const palette = AVAILABLE_WIDGETS.find((item) => item.type === type);
      const widgetDefaults = palette ? createWidgetFromPalette(palette) : { type, title: type };
      dispatch(
        addWidget({
          ...widgetDefaults,
          position: { w: 4, h: 4 },
        }),
      );
    },
    [dispatch],
  );

  const handleMoveWidget = React.useCallback(
    (from: number, to: number) => {
      dispatch(moveWidgetAction({ fromIndex: from, toIndex: to }));
    },
    [dispatch],
  );

  const handleRemoveWidget = React.useCallback(
    (id: string) => {
      dispatch(removeWidget(id));
    },
    [dispatch],
  );

  const handleSave = React.useCallback(async () => {
    const payload: SaveDashboardConfigurationInput = {
      id: persistedId ?? dashboardId ?? null,
      name,
      layout,
      widgets: widgets.map(mapStateWidgetToInput),
      settings: {
        version: 1,
        updatedAt: new Date().toISOString(),
      },
    };

    const result = await saveDashboard({
      variables: {
        input: payload,
      },
    });

    if (result.data?.saveDashboardConfiguration) {
      dispatch(
        markSaved({
          id: result.data.saveDashboardConfiguration.id,
          updatedAt: result.data.saveDashboardConfiguration.updatedAt,
          settings: result.data.saveDashboardConfiguration.settings ?? null,
        }),
      );
      setFeedback('Layout saved');
      setTimeout(() => setFeedback(null), 2500);
    }
  }, [dashboardId, dispatch, layout, name, persistedId, saveDashboard, widgets]);

  const handleNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    dispatch(setName(event.target.value));
  };

  const handleLayoutChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    dispatch(setLayout(event.target.value as 'grid' | 'freeform'));
  };

  const loading = queryResult.loading && !hasInitialized.current;

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="space-y-4" aria-busy={loading}>
        <header className="flex flex-col gap-3 rounded-2xl border border-slate-800/60 bg-slate-950/60 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex-1">
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-400" htmlFor="dashboard-name">
              Dashboard name
            </label>
            <input
              id="dashboard-name"
              data-testid="dashboard-name-input"
              value={name}
              onChange={handleNameChange}
              className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none"
            />
            <div className="mt-2 text-xs text-slate-500">
              {dirty ? (
                <span className="text-amber-400">Unsaved changes</span>
              ) : lastSavedAt ? (
                <span>Last saved {new Date(lastSavedAt).toLocaleTimeString()}</span>
              ) : (
                <span>Personalize your analyst workspace</span>
              )}
              {feedback ? <span className="ml-2 text-emerald-300">{feedback}</span> : null}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <label className="text-xs text-slate-400" htmlFor="dashboard-layout">
              Layout
            </label>
            <select
              id="dashboard-layout"
              value={layout}
              onChange={handleLayoutChange}
              className="rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-100 focus:border-emerald-500"
            >
              <option value="grid">Grid</option>
              <option value="freeform">Freeform</option>
            </select>
            <button
              type="button"
              data-testid="dashboard-save"
              onClick={handleSave}
              disabled={!dirty || saveState.loading}
              className={`rounded-lg px-3 py-1 text-xs font-semibold transition ${
                dirty && !saveState.loading
                  ? 'bg-emerald-500 text-slate-950 hover:bg-emerald-400'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              {saveState.loading ? 'Saving…' : 'Save layout'}
            </button>
          </div>
        </header>

        <div className="grid gap-4 lg:grid-cols-[280px,1fr]">
          <WidgetPalette onAdd={handleAddWidget} />
          <DashboardCanvas onAddWidget={handleAddWidget}>
            {widgets.length === 0 ? (
              <p className="text-sm text-slate-400">Drag widgets from the palette to begin building.</p>
            ) : (
              widgets.map((widget, index) => (
                <DashboardWidgetCard
                  key={widget.id}
                  widget={widget}
                  index={index}
                  onMove={handleMoveWidget}
                  onRemove={handleRemoveWidget}
                />
              ))
            )}
          </DashboardCanvas>
        </div>
      </div>
    </DndProvider>
  );
}

export default DashboardBuilder;
