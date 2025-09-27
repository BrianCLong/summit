import { useMemo, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { useQuery } from '@apollo/client';
import { format } from 'date-fns';
import { EXPLAIN_DECISION_QUERY, type ExplainDecisionQueryResult } from './queries';

type LayerKey = 'evidence' | 'dissent' | 'policy';

type LayerConfig = {
  key: LayerKey;
  title: string;
  description: string;
  summaryField: keyof Pick<ExplainDecisionQueryResult['decisionExplanation'], 'evidenceSummary' | 'dissentSummary' | 'policySummary'>;
};

export type ExplainDecisionProps = {
  paragraphId: string;
  initialLayers?: LayerKey[];
};

const layerConfigs: LayerConfig[] = [
  {
    key: 'evidence',
    title: 'Evidence map',
    description: 'Cited supporting material with provenance tooltips.',
    summaryField: 'evidenceSummary',
  },
  {
    key: 'dissent',
    title: 'Recorded dissent',
    description: 'Documented counterpoints and their cited authors.',
    summaryField: 'dissentSummary',
  },
  {
    key: 'policy',
    title: 'Gating authorities',
    description: 'Policies and authorities constraining dissemination.',
    summaryField: 'policySummary',
  },
];

const formatDate = (isoDate: string) => {
  try {
    return format(new Date(isoDate), 'PPP p');
  } catch (error) {
    return isoDate;
  }
};

const buildLayerSet = (layers?: LayerKey[]) => new Set<LayerKey>(layers && layers.length ? layers : layerConfigs.map(({ key }) => key));

type TooltipState = {
  activeId: string | null;
};

export const ExplainDecision = ({ paragraphId, initialLayers }: ExplainDecisionProps) => {
  const [activeLayers, setActiveLayers] = useState<Set<LayerKey>>(() => buildLayerSet(initialLayers));
  const [tooltipState, setTooltipState] = useState<TooltipState>({ activeId: null });

  const { data, loading, error } = useQuery<ExplainDecisionQueryResult>(EXPLAIN_DECISION_QUERY, {
    variables: { paragraphId },
  });

  const explanation = data?.decisionExplanation;

  const toggleLayer = (layer: LayerKey) => {
    setActiveLayers((current) => {
      const next = new Set(current);
      if (next.has(layer)) {
        next.delete(layer);
      } else {
        next.add(layer);
      }
      return next;
    });
  };

  const handleTooltipVisibility = (id: string | null) => () => {
    setTooltipState({ activeId: id });
  };

  const layerStatus = useMemo(() => {
    if (!explanation) {
      return null;
    }

    return layerConfigs
      .filter(({ key }) => activeLayers.has(key))
      .map(({ key, summaryField }) => explanation[summaryField])
      .join(' ');
  }, [activeLayers, explanation]);

  const renderEvidence = () => {
    if (!explanation) return null;

    return (
      <ul className="space-y-4" aria-label="Evidence citations">
        {explanation.evidence.map((item) => {
          const tooltipId = `${item.id}-tooltip`;

          return (
            <li key={item.id} className="rounded-lg border border-slate-200 bg-white/70 p-4 shadow-sm focus-within:ring-2 focus-within:ring-indigo-500">
              <article aria-labelledby={`${item.id}-label`}>
                <h4 id={`${item.id}-label`} className="text-lg font-semibold text-slate-900">
                  <button
                    type="button"
                    className="text-left"
                    data-interactive="item"
                    onKeyDown={(event) => handleRovingKeydown(event)}
                  >
                    <span>{item.label}</span>
                    <span className="ml-2 text-sm font-medium text-indigo-700">{item.labelCitation}</span>
                  </button>
                </h4>
                <p className="mt-2 text-base text-slate-700">
                  {item.detail}{' '}
                  <span className="text-sm font-medium text-indigo-700">{item.provenanceCitation}</span>
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <button
                    type="button"
                    className="rounded-md border border-indigo-200 bg-indigo-50 px-3 py-1 text-sm font-medium text-indigo-700 transition hover:bg-indigo-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
                    aria-describedby={tooltipId}
                    onFocus={handleTooltipVisibility(item.id)}
                    onBlur={handleTooltipVisibility(null)}
                    onMouseEnter={handleTooltipVisibility(item.id)}
                    onMouseLeave={handleTooltipVisibility(null)}
                  >
                    View provenance detail
                  </button>
                  <span id={tooltipId} role="tooltip" className={`max-w-xl rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-800 shadow transition ${
                    tooltipState.activeId === item.id ? 'opacity-100' : 'pointer-events-none opacity-0'
                  }`} aria-hidden={tooltipState.activeId === item.id ? undefined : true}>
                    {item.provenance}
                  </span>
                </div>
              </article>
            </li>
          );
        })}
      </ul>
    );
  };

  const renderDissent = () => {
    if (!explanation) return null;

    return (
      <ul className="space-y-4" aria-label="Dissent excerpts">
        {explanation.dissents.map((item) => (
          <li key={item.id} className="rounded-lg border border-rose-200 bg-white/70 p-4 shadow-sm">
            <article aria-labelledby={`${item.id}-author`}>
              <h4 id={`${item.id}-author`} className="text-lg font-semibold text-rose-900">
                <span>{item.author}</span>
                <span className="ml-2 text-sm font-medium text-rose-700">{item.authorCitation}</span>
              </h4>
              <p className="mt-2 text-base text-rose-800">{item.excerpt}</p>
            </article>
          </li>
        ))}
      </ul>
    );
  };

  const renderPolicies = () => {
    if (!explanation) return null;

    return (
      <ul className="space-y-4" aria-label="Policy authorities">
        {explanation.policies.map((item) => (
          <li key={item.id} className="rounded-lg border border-emerald-200 bg-white/70 p-4 shadow-sm">
            <article aria-labelledby={`${item.id}-title`}>
              <h4 id={`${item.id}-title`} className="text-lg font-semibold text-emerald-900">
                <span>{item.title}</span>
                <span className="ml-2 text-sm font-medium text-emerald-700">{item.titleCitation}</span>
              </h4>
              <p className="mt-2 text-base text-emerald-800">{item.authority}</p>
            </article>
          </li>
        ))}
      </ul>
    );
  };

  if (loading) {
    return (
      <section
        aria-live="polite"
        className="rounded-xl border border-slate-200 bg-white/80 p-6 text-center shadow"
      >
        <p className="text-base font-medium text-slate-600">Loading explanation…</p>
      </section>
    );
  }

  if (error || !explanation) {
    return (
      <section
        role="alert"
        className="rounded-xl border border-rose-200 bg-rose-50 p-6 shadow"
      >
        <p className="text-base font-semibold text-rose-900">
          Unable to load the explanation for the requested paragraph.
        </p>
      </section>
    );
  }

  return (
    <section
      aria-labelledby="explain-decision-heading"
      className="flex flex-col gap-6 rounded-2xl border border-slate-200 bg-gradient-to-b from-white via-slate-50 to-white p-6 shadow-lg"
    >
      <header className="space-y-2">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h3 id="explain-decision-heading" className="text-2xl font-bold text-slate-900">
            {explanation.metadata.heading}{' '}
            <span className="text-base font-semibold text-indigo-700">{explanation.metadata.headingCitation}</span>
          </h3>
          <p className="text-sm font-medium text-slate-600">
            Paragraph ID: <span className="text-slate-900">{explanation.paragraphId}</span>
          </p>
        </div>
        <p className="text-sm text-slate-700">
          Prepared by {explanation.metadata.preparedBy}. Updated {formatDate(explanation.metadata.updatedAt)}{' '}
          <span className="font-medium text-indigo-700">{explanation.metadata.updatedAtCitation}</span>
          .
        </p>
      </header>

      <nav aria-label="Explanation layers" className="flex flex-wrap gap-3">
        {layerConfigs.map(({ key, title, description }) => {
          const isActive = activeLayers.has(key);
          return (
            <button
              key={key}
              type="button"
              role="switch"
              aria-checked={isActive}
              aria-controls={`${key}-layer`}
              className={`flex min-w-[12rem] flex-1 flex-col gap-1 rounded-xl border px-4 py-3 text-left shadow transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 ${
                isActive
                  ? 'border-indigo-500 bg-indigo-600 text-white'
                  : 'border-slate-200 bg-white text-slate-800 hover:border-indigo-300 hover:bg-indigo-50'
              }`}
              onClick={() => toggleLayer(key)}
            >
              <span className="text-lg font-semibold">{title}</span>
              <span className="text-sm opacity-90">{description}</span>
              <span className="text-xs font-medium text-indigo-100">
                {isActive ? 'Layer visible' : 'Layer hidden'}
              </span>
            </button>
          );
        })}
      </nav>

      <p aria-live="polite" className="text-sm text-slate-600">
        {layerStatus}
      </p>

      <div className="space-y-8">
        {activeLayers.has('evidence') && (
          <section id="evidence-layer" aria-label="Evidence layer" className="space-y-4">
            <header>
              <h4 className="text-xl font-semibold text-slate-900">Evidence map</h4>
              <p className="text-sm text-slate-700">{explanation.evidenceSummary}</p>
            </header>
            {renderEvidence()}
          </section>
        )}

        {activeLayers.has('dissent') && (
          <section id="dissent-layer" aria-label="Dissent layer" className="space-y-4">
            <header>
              <h4 className="text-xl font-semibold text-rose-900">Dissent excerpts</h4>
              <p className="text-sm text-rose-800">{explanation.dissentSummary}</p>
            </header>
            {renderDissent()}
          </section>
        )}

        {activeLayers.has('policy') && (
          <section id="policy-layer" aria-label="Policy layer" className="space-y-4">
            <header>
              <h4 className="text-xl font-semibold text-emerald-900">Bound policies</h4>
              <p className="text-sm text-emerald-800">{explanation.policySummary}</p>
            </header>
            {renderPolicies()}
          </section>
        )}
      </div>
    </section>
  );
};

const handleRovingKeydown = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
  const keys = ['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight'];
  if (!keys.includes(event.key)) {
    return;
  }

  const current = event.currentTarget;
  const list = current.closest('ul');
  if (!list) {
    return;
  }

  const focusable = Array.from(list.querySelectorAll<HTMLButtonElement>('button[data-interactive="item"]'));
  const currentIndex = focusable.indexOf(current);
  if (currentIndex === -1) {
    return;
  }

  event.preventDefault();

  const delta = event.key === 'ArrowDown' || event.key === 'ArrowRight' ? 1 : -1;
  const nextIndex = (currentIndex + delta + focusable.length) % focusable.length;
  focusable[nextIndex]?.focus();
};

export default ExplainDecision;
