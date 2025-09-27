import type { FC, ReactNode } from 'react';
import { Fragment } from 'react';
import type {
  MsqeEvent,
  RetrievalCandidateTrace,
  TraceBundle,
} from '../types.js';

function formatScore(score: number): string {
  return Number.isFinite(score) ? score.toFixed(3) : 'n/a';
}

function Definition({ term, children }: { readonly term: string; readonly children: ReactNode }) {
  return (
    <Fragment>
      <dt>{term}</dt>
      <dd>{children}</dd>
    </Fragment>
  );
}

function CandidateList({ candidates }: { readonly candidates: readonly RetrievalCandidateTrace[] }) {
  return (
    <ol className="msqe-candidates">
      {candidates.map((candidate) => (
        <li key={`${candidate.ranking}-${candidate.id}`} className="msqe-candidate">
          <div className="msqe-candidate__header">
            <span className="msqe-candidate__ranking">#{candidate.ranking}</span>
            <span className="msqe-candidate__id">{candidate.id}</span>
            <span className="msqe-candidate__score">score {formatScore(candidate.score)}</span>
          </div>
          {candidate.reason ? (
            <div className="msqe-candidate__reason">{candidate.reason}</div>
          ) : null}
          <dl className="msqe-candidate__meta">
            {candidate.contentDigest ? (
              <Definition term="content digest">{candidate.contentDigest}</Definition>
            ) : null}
            {candidate.metadataKeys && candidate.metadataKeys.length > 0 ? (
              <Definition term="metadata keys">
                {candidate.metadataKeys.join(', ')}
              </Definition>
            ) : null}
          </dl>
        </li>
      ))}
    </ol>
  );
}

function renderEvent(event: MsqeEvent): JSX.Element {
  switch (event.kind) {
    case 'retrieval':
      return (
        <div className="msqe-event msqe-event--retrieval" data-stage={event.stage}>
          <header>
            <h3>Retrieval · {event.stage}</h3>
            <dl>
              <Definition term="Query digest">{event.queryDigest}</Definition>
              {event.queryPreview ? (
                <Definition term="Query preview">{event.queryPreview}</Definition>
              ) : null}
            </dl>
          </header>
          <section>
            <h4>Candidates ({event.candidates.length})</h4>
            <CandidateList candidates={event.candidates} />
          </section>
          <section>
            <h4>Filters ({event.filters.length})</h4>
            <ol className="msqe-filters">
              {event.filters.map((filter) => (
                <li key={filter.name}>
                  <div className="msqe-filter__header">
                    <span className="msqe-filter__name">{filter.name}</span>
                    <span className="msqe-filter__counts">
                      {filter.before} → {filter.after}
                    </span>
                  </div>
                  {filter.dropped.length > 0 ? (
                    <div className="msqe-filter__dropped">
                      Dropped: {filter.dropped.join(', ')}
                    </div>
                  ) : null}
                  {filter.rationale ? (
                    <div className="msqe-filter__rationale">{filter.rationale}</div>
                  ) : null}
                </li>
              ))}
            </ol>
          </section>
        </div>
      );
    case 'tool-call':
      return (
        <div className="msqe-event msqe-event--tool" data-call={event.callId}>
          <header>
            <h3>Tool call · {event.tool}</h3>
            <dl>
              <Definition term="Call id">{event.callId}</Definition>
              <Definition term="Arguments digest">{event.argsDigest}</Definition>
              {event.resultDigest ? (
                <Definition term="Result digest">{event.resultDigest}</Definition>
              ) : null}
              {typeof event.latencyMs === 'number' ? (
                <Definition term="Latency">{event.latencyMs} ms</Definition>
              ) : null}
            </dl>
          </header>
          <dl className="msqe-tool__previews">
            {event.argsPreview ? (
              <Definition term="Arguments preview">{event.argsPreview}</Definition>
            ) : null}
            {event.resultPreview ? (
              <Definition term="Result preview">{event.resultPreview}</Definition>
            ) : null}
            {event.error ? <Definition term="Error">{event.error}</Definition> : null}
          </dl>
        </div>
      );
    case 'guard':
      return (
        <div className="msqe-event msqe-event--guard" data-guard={event.guard}>
          <header>
            <h3>Guard · {event.guard}</h3>
            <dl>
              <Definition term="Decision">{event.decision}</Definition>
              <Definition term="Applies to">{event.appliesTo}</Definition>
            </dl>
          </header>
          {event.rationale ? <p className="msqe-guard__rationale">{event.rationale}</p> : null}
        </div>
      );
    case 'output-check':
      return (
        <div className="msqe-event msqe-event--output" data-contract={event.contract}>
          <header>
            <h3>Output contract · {event.contract}</h3>
            <dl>
              <Definition term="Status">{event.valid ? 'valid' : 'invalid'}</Definition>
              <Definition term="Output digest">{event.outputDigest}</Definition>
            </dl>
          </header>
          {event.issues && event.issues.length > 0 ? (
            <section>
              <h4>Issues</h4>
              <ul>
                {event.issues.map((issue, index) => (
                  <li key={`${event.ordinal}-issue-${index}`}>{issue}</li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      );
    default:
      return <div className="msqe-event">Unsupported event</div>;
  }
}

function Summary({ bundle }: { readonly bundle: TraceBundle }) {
  const { summary } = bundle;
  return (
    <section className="msqe-summary">
      <h2>Trace summary</h2>
      <dl>
        <Definition term="Request">{bundle.requestId}</Definition>
        <Definition term="Created">{bundle.createdAt}</Definition>
        <Definition term="Retrievals">{summary.retrievals}</Definition>
        <Definition term="Total candidates">{summary.totalCandidates}</Definition>
        <Definition term="Filters applied">{summary.filtersApplied}</Definition>
        <Definition term="Tool calls">{summary.toolCalls}</Definition>
        <Definition term="Guard decisions">{summary.guardDecisions.total}</Definition>
        <Definition term="Output contract">
          {summary.outputValid ? 'satisfied' : 'failed'}
        </Definition>
      </dl>
    </section>
  );
}

function SignatureDetails({ bundle, showSignature }: { readonly bundle: TraceBundle; readonly showSignature: boolean }) {
  if (!showSignature) {
    return null;
  }

  return (
    <section className="msqe-signature">
      <h2>Signature</h2>
      <dl>
        <Definition term="Hash">{bundle.hash}</Definition>
        <Definition term="Signature">{bundle.signature}</Definition>
        {bundle.keyId ? <Definition term="Key id">{bundle.keyId}</Definition> : null}
      </dl>
    </section>
  );
}

export interface MsqeInspectorProps {
  readonly bundle: TraceBundle;
  readonly showSignature?: boolean;
}

export const MsqeInspector: FC<MsqeInspectorProps> = ({ bundle, showSignature = true }) => {
  const events = [...bundle.events].sort((a, b) => a.ordinal - b.ordinal);

  return (
    <section className="msqe" data-request={bundle.requestId}>
      <Summary bundle={bundle} />
      <ol className="msqe-events">
        {events.map((event) => (
          <li key={event.ordinal} data-kind={event.kind} data-ordinal={event.ordinal} className="msqe-events__item">
            <header className="msqe-event__meta">
              <span className="msqe-event__ordinal">#{event.ordinal}</span>
              <span className="msqe-event__timestamp">{event.at}</span>
            </header>
            <Fragment>{renderEvent(event)}</Fragment>
          </li>
        ))}
      </ol>
      <SignatureDetails bundle={bundle} showSignature={showSignature} />
    </section>
  );
};
