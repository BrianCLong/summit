import React, { useMemo, useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  selectEntity,
  setSearchFilter,
  toggleTypeFilter,
  setMinDeceptionScore,
  clearFilters,
  EntityType,
  Entity,
} from '../store/workspaceSlice';

const TYPE_COLORS: Record<EntityType, string> = {
  person: '#4a90d9',
  organization: '#e67e22',
  location: '#27ae60',
  event: '#9b59b6',
  document: '#e74c3c',
  account: '#1abc9c',
  unknown: '#7f8c8d',
};

const ALL_TYPES: EntityType[] = [
  'person',
  'organization',
  'location',
  'event',
  'document',
  'account',
];

interface TypeBadgeProps {
  type: EntityType;
}

const TypeBadge: React.FC<TypeBadgeProps> = ({ type }) => (
  <span
    className="entity-type-badge"
    style={{ backgroundColor: TYPE_COLORS[type] ?? TYPE_COLORS.unknown }}
    aria-label={`Type: ${type}`}
  >
    {type.charAt(0).toUpperCase() + type.slice(1)}
  </span>
);

interface DeceptionBarProps {
  score: number;
}

const DeceptionBar: React.FC<DeceptionBarProps> = ({ score }) => {
  const pct = Math.round(score * 100);
  const color = score > 0.7 ? '#e74c3c' : score > 0.4 ? '#e67e22' : '#27ae60';
  return (
    <div
      className="deception-bar-track"
      role="meter"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`Deception score ${pct}%`}
      title={`Deception score: ${pct}%`}
    >
      <div
        className="deception-bar-fill"
        style={{ width: `${pct}%`, backgroundColor: color }}
      />
    </div>
  );
};

interface EntityRowProps {
  entity: Entity;
  isSelected: boolean;
  onSelect: (id: string) => void;
}

const EntityRow: React.FC<EntityRowProps> = ({
  entity,
  isSelected,
  onSelect,
}) => {
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onSelect(entity.id);
      }
    },
    [entity.id, onSelect],
  );

  return (
    <div
      className={`entity-row${isSelected ? ' entity-row--selected' : ''}`}
      role="option"
      aria-selected={isSelected}
      tabIndex={0}
      onClick={() => onSelect(entity.id)}
      onKeyDown={handleKeyDown}
      data-testid={`entity-row-${entity.id}`}
    >
      <div className="entity-row-header">
        <span className="entity-label" title={entity.label}>
          {entity.label}
        </span>
        <TypeBadge type={entity.type} />
      </div>
      <DeceptionBar score={entity.deception_score} />
      <span className="entity-connections-count" aria-label="connections">
        {entity.connections.length} connection
        {entity.connections.length !== 1 ? 's' : ''}
      </span>
    </div>
  );
};

const EntityExplorer: React.FC = () => {
  const dispatch = useAppDispatch();
  const { case: caseData, selectedEntityId, filters, loadingState } =
    useAppSelector((s) => s.workspace);

  const handleSelect = useCallback(
    (id: string) => {
      dispatch(selectEntity(selectedEntityId === id ? null : id));
    },
    [dispatch, selectedEntityId],
  );

  const filteredEntities = useMemo<Entity[]>(() => {
    if (!caseData) return [];
    return caseData.entities.filter((e) => {
      const matchesSearch =
        !filters.search ||
        e.label.toLowerCase().includes(filters.search.toLowerCase()) ||
        e.type.toLowerCase().includes(filters.search.toLowerCase());
      const matchesType =
        filters.types.length === 0 || filters.types.includes(e.type);
      const matchesScore = e.deception_score >= filters.minDeceptionScore;
      return matchesSearch && matchesType && matchesScore;
    });
  }, [caseData, filters]);

  const hasActiveFilters =
    filters.search !== '' ||
    filters.types.length > 0 ||
    filters.minDeceptionScore > 0;

  return (
    <aside
      className="entity-explorer"
      aria-label="Entity Explorer"
      role="complementary"
    >
      <header className="explorer-header">
        <h2 className="explorer-title">Graph Explorer</h2>
        {caseData && (
          <span className="case-badge" title={caseData.id}>
            {caseData.title}
          </span>
        )}
      </header>

      {/* Search */}
      <div className="explorer-search">
        <label htmlFor="entity-search" className="sr-only">
          Search entities
        </label>
        <input
          id="entity-search"
          type="search"
          className="search-input"
          placeholder="Search entities…"
          value={filters.search}
          onChange={(e) => dispatch(setSearchFilter(e.target.value))}
          aria-label="Search entities"
          data-testid="entity-search-input"
        />
      </div>

      {/* Type filters */}
      <div className="type-filter-row" role="group" aria-label="Filter by type">
        {ALL_TYPES.map((t) => (
          <button
            key={t}
            className={`type-filter-btn${filters.types.includes(t) ? ' type-filter-btn--active' : ''}`}
            style={
              filters.types.includes(t)
                ? { backgroundColor: TYPE_COLORS[t], borderColor: TYPE_COLORS[t] }
                : { borderColor: TYPE_COLORS[t] }
            }
            onClick={() => dispatch(toggleTypeFilter(t))}
            aria-pressed={filters.types.includes(t)}
            aria-label={`Filter by ${t}`}
            data-testid={`type-filter-${t}`}
          >
            {t.charAt(0).toUpperCase()}
          </button>
        ))}
      </div>

      {/* Deception score threshold */}
      <div className="score-filter">
        <label htmlFor="score-slider" className="score-filter-label">
          Min risk score:{' '}
          <strong>{Math.round(filters.minDeceptionScore * 100)}%</strong>
        </label>
        <input
          id="score-slider"
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={filters.minDeceptionScore}
          onChange={(e) =>
            dispatch(setMinDeceptionScore(parseFloat(e.target.value)))
          }
          className="score-slider"
          aria-label="Minimum deception score filter"
        />
      </div>

      {/* Clear filters */}
      {hasActiveFilters && (
        <button
          className="clear-filters-btn"
          onClick={() => dispatch(clearFilters())}
          data-testid="clear-filters-btn"
        >
          Clear filters
        </button>
      )}

      {/* Entity list */}
      <div
        className="entity-list"
        role="listbox"
        aria-label="Entity list"
        aria-multiselectable="false"
      >
        {loadingState === 'loading' && (
          <div className="explorer-skeleton" aria-busy="true" aria-label="Loading entities">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="skeleton-row" />
            ))}
          </div>
        )}

        {loadingState === 'error' && (
          <div className="explorer-state-msg explorer-state-msg--error" role="alert">
            Failed to load entities
          </div>
        )}

        {loadingState === 'success' && filteredEntities.length === 0 && (
          <div
            className="explorer-state-msg"
            role="status"
            data-testid="no-results-msg"
          >
            No entities match your filters
          </div>
        )}

        {filteredEntities.map((entity) => (
          <EntityRow
            key={entity.id}
            entity={entity}
            isSelected={selectedEntityId === entity.id}
            onSelect={handleSelect}
          />
        ))}
      </div>

      {/* Summary */}
      {loadingState === 'success' && (
        <footer className="explorer-footer">
          <span role="status" aria-live="polite">
            {filteredEntities.length} of {caseData?.entities.length ?? 0}{' '}
            entities
          </span>
        </footer>
      )}
    </aside>
  );
};

export default EntityExplorer;
