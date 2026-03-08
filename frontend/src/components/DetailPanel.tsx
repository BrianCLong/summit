import React, { useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  selectEntity,
  selectEvent,
  TimelineEvent,
  Report,
  Entity,
} from '../store/workspaceSlice';

// ---------------------------------------------------------------------------
// Severity badge
// ---------------------------------------------------------------------------
const SEVERITY_COLORS: Record<TimelineEvent['severity'], string> = {
  low: '#27ae60',
  medium: '#f39c12',
  high: '#e67e22',
  critical: '#e74c3c',
};

interface SeverityBadgeProps {
  severity: TimelineEvent['severity'];
}

const SeverityBadge: React.FC<SeverityBadgeProps> = ({ severity }) => (
  <span
    className="severity-badge"
    style={{ backgroundColor: SEVERITY_COLORS[severity] }}
    aria-label={`Severity: ${severity}`}
  >
    {severity.toUpperCase()}
  </span>
);

// ---------------------------------------------------------------------------
// Timeline event row
// ---------------------------------------------------------------------------
interface EventRowProps {
  event: TimelineEvent;
  isSelected: boolean;
  relatedEntityLabel?: string;
  onSelect: (id: string) => void;
  onJumpToEntity?: (id: string) => void;
}

const EventRow: React.FC<EventRowProps> = ({
  event,
  isSelected,
  relatedEntityLabel,
  onSelect,
  onJumpToEntity,
}) => {
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onSelect(event.id);
      }
    },
    [event.id, onSelect],
  );

  const date = new Date(event.timestamp).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div
      className={`event-row${isSelected ? ' event-row--selected' : ''}`}
      role="option"
      aria-selected={isSelected}
      tabIndex={0}
      onClick={() => onSelect(event.id)}
      onKeyDown={handleKeyDown}
      data-testid={`event-row-${event.id}`}
    >
      <div className="event-row-top">
        <time className="event-time" dateTime={event.timestamp}>
          {date}
        </time>
        <SeverityBadge severity={event.severity} />
      </div>
      <p className="event-action">{event.action}</p>
      <div className="event-row-meta">
        <span className="event-confidence">
          Confidence: {Math.round(event.confidence * 100)}%
        </span>
        <span className="event-result">{event.result}</span>
        {relatedEntityLabel && onJumpToEntity && event.entityId && (
          <button
            className="event-jump-btn"
            onClick={(e) => {
              e.stopPropagation();
              onJumpToEntity(event.entityId!);
            }}
            aria-label={`Jump to entity ${relatedEntityLabel}`}
          >
            → {relatedEntityLabel}
          </button>
        )}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Report card
// ---------------------------------------------------------------------------
interface ReportCardProps {
  report: Report;
  entities: Entity[];
  onEntityClick: (id: string) => void;
}

const STATUS_COLORS: Record<Report['status'], string> = {
  draft: '#7f8c8d',
  review: '#f39c12',
  final: '#27ae60',
};

const ReportCard: React.FC<ReportCardProps> = ({
  report,
  entities,
  onEntityClick,
}) => {
  const date = new Date(report.createdAt).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  return (
    <article
      className="report-card"
      aria-label={`Report: ${report.title}`}
      data-testid={`report-card-${report.id}`}
    >
      <header className="report-card-header">
        <h4 className="report-card-title">{report.title}</h4>
        <span
          className="report-status-badge"
          style={{ backgroundColor: STATUS_COLORS[report.status] }}
        >
          {report.status}
        </span>
      </header>
      <p className="report-summary">{report.summary}</p>
      <footer className="report-card-footer">
        <time className="report-date" dateTime={report.createdAt}>
          {date}
        </time>
        <div className="report-entities" aria-label="Linked entities">
          {report.entityIds.map((eid) => {
            const e = entities.find((x) => x.id === eid);
            return e ? (
              <button
                key={eid}
                className="report-entity-tag"
                onClick={() => onEntityClick(eid)}
                aria-label={`Focus entity ${e.label}`}
              >
                {e.label}
              </button>
            ) : null;
          })}
        </div>
      </footer>
    </article>
  );
};

// ---------------------------------------------------------------------------
// Selected item detail section
// ---------------------------------------------------------------------------
interface SelectedItemDetailProps {
  selectedEventId: string | null;
  events: TimelineEvent[];
}

const SelectedItemDetail: React.FC<SelectedItemDetailProps> = ({
  selectedEventId,
  events,
}) => {
  if (!selectedEventId) return null;
  const event = events.find((e) => e.id === selectedEventId);
  if (!event) return null;

  return (
    <div
      className="selected-item-detail"
      role="region"
      aria-label="Selected event detail"
    >
      <h4 className="detail-section-title">Event Detail</h4>
      <dl className="detail-props">
        <dt>Timestamp</dt>
        <dd>
          <time dateTime={event.timestamp}>
            {new Date(event.timestamp).toLocaleString()}
          </time>
        </dd>
        <dt>Action</dt>
        <dd>{event.action}</dd>
        <dt>Confidence</dt>
        <dd>{Math.round(event.confidence * 100)}%</dd>
        <dt>Result</dt>
        <dd>{event.result}</dd>
        <dt>Severity</dt>
        <dd>
          <SeverityBadge severity={event.severity} />
        </dd>
      </dl>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Main DetailPanel component
// ---------------------------------------------------------------------------
type Tab = 'timeline' | 'reports';

const DetailPanel: React.FC = () => {
  const dispatch = useAppDispatch();
  const {
    case: caseData,
    selectedEntityId,
    selectedEventId,
    loadingState,
  } = useAppSelector((s) => s.workspace);

  const [activeTab, setActiveTab] = React.useState<Tab>('timeline');

  const events = caseData?.events ?? [];
  const reports = caseData?.reports ?? [];
  const entities = caseData?.entities ?? [];

  // Filter events by selected entity
  const visibleEvents =
    selectedEntityId
      ? events.filter((ev) => ev.entityId === selectedEntityId)
      : events;

  const handleSelectEvent = useCallback(
    (id: string) => {
      dispatch(selectEvent(selectedEventId === id ? null : id));
    },
    [dispatch, selectedEventId],
  );

  const handleJumpToEntity = useCallback(
    (id: string) => {
      dispatch(selectEntity(id));
    },
    [dispatch],
  );

  return (
    <aside
      className="detail-panel"
      aria-label="Timeline and Reports"
      role="complementary"
    >
      <header className="detail-panel-header">
        <h2 className="detail-panel-title">
          {selectedEntityId
            ? `Timeline: ${entities.find((e) => e.id === selectedEntityId)?.label ?? selectedEntityId}`
            : 'Case Timeline'}
        </h2>
      </header>

      {/* Tab bar */}
      <div className="tab-bar" role="tablist" aria-label="Detail panel tabs">
        <button
          className={`tab-btn${activeTab === 'timeline' ? ' tab-btn--active' : ''}`}
          role="tab"
          aria-selected={activeTab === 'timeline'}
          aria-controls="panel-timeline"
          id="tab-timeline"
          onClick={() => setActiveTab('timeline')}
        >
          Timeline
          {visibleEvents.length > 0 && (
            <span className="tab-count">{visibleEvents.length}</span>
          )}
        </button>
        <button
          className={`tab-btn${activeTab === 'reports' ? ' tab-btn--active' : ''}`}
          role="tab"
          aria-selected={activeTab === 'reports'}
          aria-controls="panel-reports"
          id="tab-reports"
          onClick={() => setActiveTab('reports')}
        >
          Reports
          {reports.length > 0 && (
            <span className="tab-count">{reports.length}</span>
          )}
        </button>
      </div>

      {/* Loading / error states */}
      {loadingState === 'loading' && (
        <div className="detail-skeleton" aria-busy="true" aria-label="Loading timeline">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton-row skeleton-row--tall" />
          ))}
        </div>
      )}

      {loadingState === 'error' && (
        <div className="detail-state-msg detail-state-msg--error" role="alert">
          Failed to load case data
        </div>
      )}

      {/* Timeline tab */}
      {loadingState === 'success' && activeTab === 'timeline' && (
        <div
          id="panel-timeline"
          role="tabpanel"
          aria-labelledby="tab-timeline"
          className="tab-panel"
        >
          {visibleEvents.length === 0 ? (
            <div
              className="detail-state-msg"
              role="status"
              data-testid="no-events-msg"
            >
              {selectedEntityId
                ? 'No events for this entity'
                : 'No events in case'}
            </div>
          ) : (
            <div
              className="event-list"
              role="listbox"
              aria-label="Timeline events"
            >
              {visibleEvents.map((ev) => {
                const relatedEntity = entities.find(
                  (e) => e.id === ev.entityId,
                );
                return (
                  <EventRow
                    key={ev.id}
                    event={ev}
                    isSelected={selectedEventId === ev.id}
                    relatedEntityLabel={relatedEntity?.label}
                    onSelect={handleSelectEvent}
                    onJumpToEntity={
                      selectedEntityId ? undefined : handleJumpToEntity
                    }
                  />
                );
              })}
            </div>
          )}

          <SelectedItemDetail
            selectedEventId={selectedEventId}
            events={events}
          />
        </div>
      )}

      {/* Reports tab */}
      {loadingState === 'success' && activeTab === 'reports' && (
        <div
          id="panel-reports"
          role="tabpanel"
          aria-labelledby="tab-reports"
          className="tab-panel"
        >
          {reports.length === 0 ? (
            <div className="detail-state-msg" role="status">
              No reports in case
            </div>
          ) : (
            <div className="reports-list">
              {reports.map((rep) => (
                <ReportCard
                  key={rep.id}
                  report={rep}
                  entities={entities}
                  onEntityClick={handleJumpToEntity}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Idle state */}
      {loadingState === 'idle' && (
        <div className="detail-state-msg" role="status">
          Open a case to view timeline and reports
        </div>
      )}
    </aside>
  );
};

export default DetailPanel;
