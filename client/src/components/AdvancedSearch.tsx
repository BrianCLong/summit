import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useQuery, gql } from '@apollo/client';

const SEARCH_ENTITIES = gql`
  query SearchEntities($query: String!, $filters: SearchFilters) {
    searchEntities(query: $query, filters: $filters) {
      nodes {
        id
        type
        label
        description
        confidence
        properties
        createdAt
        updatedAt
      }
      totalCount
      hasMore
    }
  }
`;

interface SearchFilters {
  entityTypes: string[];
  confidenceRange: [number, number];
  dateRange: [string, string];
  investigations: string[];
}

interface AdvancedSearchProps {
  onResultSelect?: (result: any) => void;
  placeholder?: string;
  showFilters?: boolean;
}

function AdvancedSearch({
  onResultSelect,
  placeholder = 'Search entities, investigations, or actions...',
  showFilters = true,
}: AdvancedSearchProps) {
  const [query, setQuery] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({
    entityTypes: [],
    confidenceRange: [0, 100],
    dateRange: ['', ''],
    investigations: [],
  });

  const searchLabelId = useId();
  const searchInputId = useId();
  const filtersPanelId = useId();
  const resultsListId = useId();
  const statusMessageId = useId();
  const filterCountId = useId();
  const filterPanelRef = useRef<HTMLDivElement>(null);
  const resultsRef = useRef<HTMLUListElement>(null);

  const { data, loading, error } = useQuery(SEARCH_ENTITIES, {
    variables: { query, filters },
    skip: !query.trim(),
    errorPolicy: 'all',
  });

  const entityTypes = [
    'person',
    'organization',
    'location',
    'event',
    'document',
    'IP',
    'email',
    'phone',
  ];

  const handleSearch = (searchTerm: string) => {
    setQuery(searchTerm);
    setShowResults(searchTerm.length > 2);
  };

  const handleFilterChange = (filterKey: keyof SearchFilters, value: any) => {
    setFilters((prev) => ({
      ...prev,
      [filterKey]: value,
    }));
  };

  const clearFilters = () => {
    setFilters({
      entityTypes: [],
      confidenceRange: [0, 100],
      dateRange: ['', ''],
      investigations: [],
    });
  };

  const activeFilterCount =
    filters.entityTypes.length +
    (filters.confidenceRange[0] > 0 || filters.confidenceRange[1] < 100 ? 1 : 0) +
    (filters.dateRange[0] || filters.dateRange[1] ? 1 : 0) +
    filters.investigations.length;

  useEffect(() => {
    if (showFilterPanel) {
      filterPanelRef.current?.focus();
    }
  }, [showFilterPanel]);

  useEffect(() => {
    if (showResults) {
      resultsRef.current?.focus();
    }
  }, [showResults]);

  useEffect(() => {
    if (!showFilterPanel && !showResults) {
      return;
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowFilterPanel(false);
        setShowResults(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showFilterPanel, showResults]);

  const searchStatus = useMemo(() => {
    if (loading) {
      return 'Searching…';
    }
    if (error) {
      return `Search failed: ${error.message}`;
    }
    if (showResults && data?.searchEntities?.nodes?.length === 0) {
      return `No results found for "${query}".`;
    }
    if (showResults && data?.searchEntities?.nodes?.length) {
      return `${data.searchEntities.nodes.length} results shown out of ${data.searchEntities.totalCount ?? data.searchEntities.nodes.length}.`;
    }
    return 'Type at least three characters to search entities, investigations, or actions.';
  }, [data, error, loading, query, showResults]);

  const results = data?.searchEntities?.nodes ?? [];
  const resultsOffset = showFilterPanel ? '440px' : '12px';

  return (
    <section
      className="advanced-search"
      aria-labelledby={searchLabelId}
      data-testid="advanced-search"
    >
      <h2 id={searchLabelId} className="sr-only">
        Advanced entity search
      </h2>
      <div className="advanced-search__input-container" role="search" aria-describedby={statusMessageId}>
        <span className="advanced-search__icon" aria-hidden="true">
          🔍
        </span>
        <label htmlFor={searchInputId} className="sr-only">
          {placeholder}
        </label>
        <input
          id={searchInputId}
          type="text"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder={placeholder}
          className="advanced-search__input"
          onFocus={() => query.length > 2 && setShowResults(true)}
          aria-controls={showResults ? resultsListId : undefined}
        />

        {showFilters && (
          <button
            type="button"
            onClick={() => setShowFilterPanel(!showFilterPanel)}
            className={`advanced-search__toggle${
              showFilterPanel || activeFilterCount > 0 ? ' advanced-search__toggle--active' : ''
            }`}
            aria-expanded={showFilterPanel}
            aria-controls={filtersPanelId}
            aria-describedby={activeFilterCount > 0 ? filterCountId : undefined}
          >
            ⚙️ Filters
            {activeFilterCount > 0 && (
              <span className="advanced-search__badge" id={filterCountId}>
                {activeFilterCount}
              </span>
            )}
          </button>
        )}
      </div>

      <div
        id={statusMessageId}
        className={`advanced-search__status ${
          error ? 'advanced-search__status--error' : 'advanced-search__status--muted'
        }`}
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {searchStatus}
      </div>

      {/* Filter Panel */}
      {showFilterPanel && showFilters && (
        <div
          id={filtersPanelId}
          className="advanced-search__panel"
          role="dialog"
          aria-modal="false"
          aria-labelledby={`${filtersPanelId}-heading`}
          ref={filterPanelRef}
          tabIndex={-1}
        >
          <div className="advanced-search__panel-header">
            <h3 id={`${filtersPanelId}-heading`}>Advanced Filters</h3>
            <button type="button" onClick={clearFilters} className="advanced-search__panel-clear">
              Clear all filters
            </button>
          </div>

          {/* Entity Types */}
          <div className="advanced-search__panel-section">
            <p className="advanced-search__panel-label">Entity Types</p>
            <div className="advanced-search__filter-grid">
              {entityTypes.map((type) => (
                <label
                  key={type}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px' }}
                >
                  <input
                    type="checkbox"
                    checked={filters.entityTypes.includes(type)}
                    onChange={(e) => {
                      const newTypes = e.target.checked
                        ? [...filters.entityTypes, type]
                        : filters.entityTypes.filter((t) => t !== type);
                      handleFilterChange('entityTypes', newTypes);
                    }}
                  />
                  <span style={{ textTransform: 'capitalize' }}>{type}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Confidence Range */}
          <div className="advanced-search__panel-section">
            <p className="advanced-search__panel-label">
              Confidence Range: {filters.confidenceRange[0]}% - {filters.confidenceRange[1]}%
            </p>
            <div className="advanced-search__range-inputs">
              <input
                type="range"
                min="0"
                max="100"
                value={filters.confidenceRange[0]}
                aria-label="Minimum confidence percentage"
                onChange={(e) =>
                  handleFilterChange('confidenceRange', [
                    parseInt(e.target.value),
                    filters.confidenceRange[1],
                  ])
                }
                style={{ flex: 1 }}
              />
              <input
                type="range"
                min="0"
                max="100"
                value={filters.confidenceRange[1]}
                aria-label="Maximum confidence percentage"
                onChange={(e) =>
                  handleFilterChange('confidenceRange', [
                    filters.confidenceRange[0],
                    parseInt(e.target.value),
                  ])
                }
                style={{ flex: 1 }}
              />
            </div>
          </div>

          {/* Date Range */}
          <div className="advanced-search__panel-section">
            <p className="advanced-search__panel-label">Date Range</p>
            <div className="advanced-search__dates">
              <input
                type="date"
                value={filters.dateRange[0]}
                aria-label="Start date"
                onChange={(e) =>
                  handleFilterChange('dateRange', [e.target.value, filters.dateRange[1]])
                }
                className="advanced-search__date-input"
              />
              <span style={{ alignSelf: 'center' }}>to</span>
              <input
                type="date"
                value={filters.dateRange[1]}
                aria-label="End date"
                onChange={(e) =>
                  handleFilterChange('dateRange', [filters.dateRange[0], e.target.value])
                }
                className="advanced-search__date-input"
              />
            </div>
          </div>
        </div>
      )}

      {/* Search Results */}
      {showResults && query.length > 2 && (
        <div className="advanced-search__results-wrapper" style={{ marginTop: resultsOffset }}>
          <ul
            id={resultsListId}
            className="advanced-search__results"
            role="listbox"
            aria-labelledby={searchLabelId}
            aria-describedby={statusMessageId}
            aria-busy={loading}
            tabIndex={-1}
            ref={resultsRef}
          >
            {results.map((result: any) => (
              <li key={result.id} className="advanced-search__result-item">
                <button
                  type="button"
                  role="option"
                  aria-selected="false"
                  className="advanced-search__result-button"
                  onClick={() => {
                    onResultSelect?.(result);
                    setShowResults(false);
                  }}
                >
                  <div className="advanced-search__result-header">
                    <span className="advanced-search__result-title">{result.label}</span>
                    <span className="advanced-search__result-type">{result.type}</span>
                  </div>
                  {result.description && (
                    <p className="advanced-search__result-description">
                      {result.description.length > 160
                        ? `${result.description.substring(0, 160)}…`
                        : result.description}
                    </p>
                  )}
                  <div className="advanced-search__result-meta">
                    <span>Confidence: {result.confidence}%</span>
                    <span>ID: {result.id}</span>
                    {result.updatedAt && (
                      <span>Updated: {new Date(result.updatedAt).toLocaleDateString()}</span>
                    )}
                  </div>
                </button>
              </li>
            ))}
          </ul>
          {data?.searchEntities?.hasMore && (
            <div className="advanced-search__load-more">
              <button type="button" className="advanced-search__load-more-button">
                Load more results ({data.searchEntities.totalCount} total)
              </button>
            </div>
          )}
        </div>
      )}

      {/* Click outside to close */}
      {(showResults || showFilterPanel) && (
        <div
          className="advanced-search__overlay"
          onClick={() => {
            setShowResults(false);
            setShowFilterPanel(false);
          }}
          aria-hidden="true"
        />
      )}
    </section>
  );
}

export default AdvancedSearch;
