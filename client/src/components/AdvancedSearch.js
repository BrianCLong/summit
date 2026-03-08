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
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const react_1 = __importStar(require("react"));
const client_1 = require("@apollo/client");
const SEARCH_ENTITIES = (0, client_1.gql) `
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
function AdvancedSearch({ onResultSelect, placeholder = 'Search entities, investigations, or actions...', showFilters = true, }) {
    const [query, setQuery] = (0, react_1.useState)('');
    const [showResults, setShowResults] = (0, react_1.useState)(false);
    const [showFilterPanel, setShowFilterPanel] = (0, react_1.useState)(false);
    const [filters, setFilters] = (0, react_1.useState)({
        entityTypes: [],
        confidenceRange: [0, 100],
        dateRange: ['', ''],
        investigations: [],
    });
    const { data, loading, error } = (0, client_1.useQuery)(SEARCH_ENTITIES, {
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
    const handleSearch = (searchTerm) => {
        setQuery(searchTerm);
        setShowResults(searchTerm.length > 2);
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleFilterChange = (filterKey, value) => {
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
    const activeFilterCount = filters.entityTypes.length +
        (filters.confidenceRange[0] > 0 || filters.confidenceRange[1] < 100
            ? 1
            : 0) +
        (filters.dateRange[0] || filters.dateRange[1] ? 1 : 0) +
        filters.investigations.length;
    return (<div style={{ position: 'relative', width: '100%' }}>
      {/* Search Input */}
      <div style={{
            display: 'flex',
            alignItems: 'center',
            border: '2px solid var(--hairline)',
            borderRadius: '8px',
            backgroundColor: '#fff',
            padding: '4px',
        }}>
        <div style={{ padding: '8px 12px', color: '#666' }}>🔍</div>
        <input type="text" value={query} onChange={(e) => handleSearch(e.target.value)} placeholder={placeholder} style={{
            flex: 1,
            border: 'none',
            outline: 'none',
            fontSize: '16px',
            padding: '8px 4px',
        }} onFocus={() => query.length > 2 && setShowResults(true)}/>

        {showFilters && (<button onClick={() => setShowFilterPanel(!showFilterPanel)} style={{
                padding: '8px 12px',
                border: 'none',
                background: activeFilterCount > 0 ? '#1a73e8' : 'transparent',
                color: activeFilterCount > 0 ? 'white' : '#666',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px',
                position: 'relative',
            }}>
            ⚙️ Filters
            {activeFilterCount > 0 && (<span style={{
                    position: 'absolute',
                    top: '-4px',
                    right: '-4px',
                    backgroundColor: '#ef4444',
                    color: 'white',
                    borderRadius: '50%',
                    width: '18px',
                    height: '18px',
                    fontSize: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}>
                {activeFilterCount}
              </span>)}
          </button>)}
      </div>

      {/* Filter Panel */}
      {showFilterPanel && showFilters && (<div className="panel" style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                zIndex: 1000,
                marginTop: '8px',
                padding: '20px',
                maxHeight: '400px',
                overflowY: 'auto',
            }}>
          <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '16px',
            }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '600', margin: 0 }}>
              Advanced Filters
            </h3>
            <button onClick={clearFilters} style={{
                color: '#666',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: '14px',
            }}>
              Clear All
            </button>
          </div>

          {/* Entity Types */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{
                fontSize: '14px',
                fontWeight: '600',
                marginBottom: '8px',
                display: 'block',
            }}>
              Entity Types
            </label>
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                gap: '8px',
            }}>
              {entityTypes.map((type) => (<label key={type} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '14px',
                }}>
                  <input type="checkbox" checked={filters.entityTypes.includes(type)} onChange={(e) => {
                    const newTypes = e.target.checked
                        ? [...filters.entityTypes, type]
                        : filters.entityTypes.filter((t) => t !== type);
                    handleFilterChange('entityTypes', newTypes);
                }}/>
                  <span style={{ textTransform: 'capitalize' }}>{type}</span>
                </label>))}
            </div>
          </div>

          {/* Confidence Range */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{
                fontSize: '14px',
                fontWeight: '600',
                marginBottom: '8px',
                display: 'block',
            }}>
              Confidence Range: {filters.confidenceRange[0]}% -{' '}
              {filters.confidenceRange[1]}%
            </label>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <input type="range" min="0" max="100" value={filters.confidenceRange[0]} onChange={(e) => handleFilterChange('confidenceRange', [
                parseInt(e.target.value),
                filters.confidenceRange[1],
            ])} style={{ flex: 1 }}/>
              <input type="range" min="0" max="100" value={filters.confidenceRange[1]} onChange={(e) => handleFilterChange('confidenceRange', [
                filters.confidenceRange[0],
                parseInt(e.target.value),
            ])} style={{ flex: 1 }}/>
            </div>
          </div>

          {/* Date Range */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{
                fontSize: '14px',
                fontWeight: '600',
                marginBottom: '8px',
                display: 'block',
            }}>
              Date Range
            </label>
            <div style={{ display: 'flex', gap: '12px' }}>
              <input type="date" value={filters.dateRange[0]} onChange={(e) => handleFilterChange('dateRange', [
                e.target.value,
                filters.dateRange[1],
            ])} style={{
                flex: 1,
                padding: '6px',
                border: '1px solid var(--hairline)',
                borderRadius: '4px',
            }}/>
              <span style={{ alignSelf: 'center' }}>to</span>
              <input type="date" value={filters.dateRange[1]} onChange={(e) => handleFilterChange('dateRange', [
                filters.dateRange[0],
                e.target.value,
            ])} style={{
                flex: 1,
                padding: '6px',
                border: '1px solid var(--hairline)',
                borderRadius: '4px',
            }}/>
            </div>
          </div>
        </div>)}

      {/* Search Results */}
      {showResults && query.length > 2 && (<div className="panel" style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                zIndex: 999,
                marginTop: showFilterPanel ? '420px' : '8px',
                maxHeight: '400px',
                overflowY: 'auto',
            }}>
          {loading && (<div style={{ padding: '20px', textAlign: 'center' }}>
              <div>🔍 Searching...</div>
            </div>)}

          {error && (<div style={{ padding: '20px', textAlign: 'center', color: '#dc2626' }}>
              <div>❌ Search failed: {error.message}</div>
            </div>)}

          {data?.searchEntities?.nodes?.length === 0 && !loading && (<div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
              <div>🔍 No results found for "{query}"</div>
              <div style={{ fontSize: '14px', marginTop: '8px' }}>
                Try adjusting your search terms or filters
              </div>
            </div>)}

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          {data?.searchEntities?.nodes?.map((result) => (<div key={result.id} onClick={() => {
                    onResultSelect?.(result);
                    setShowResults(false);
                }} style={{
                    padding: '16px',
                    borderBottom: '1px solid var(--hairline)',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s',
                }} onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8f9fa')} onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}>
              <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: '4px',
                }}>
                <div style={{ fontWeight: '600', fontSize: '16px' }}>
                  {result.label}
                </div>
                <div style={{
                    fontSize: '12px',
                    padding: '2px 6px',
                    backgroundColor: '#e5e7eb',
                    borderRadius: '3px',
                    textTransform: 'capitalize',
                }}>
                  {result.type}
                </div>
              </div>
              {result.description && (<div style={{
                        color: '#666',
                        fontSize: '14px',
                        marginBottom: '8px',
                    }}>
                  {result.description.length > 100
                        ? `${result.description.substring(0, 100)}...`
                        : result.description}
                </div>)}
              <div style={{
                    display: 'flex',
                    gap: '16px',
                    fontSize: '12px',
                    color: '#999',
                }}>
                <span>Confidence: {result.confidence}%</span>
                <span>ID: {result.id}</span>
                {result.updatedAt && (<span>
                    Updated: {new Date(result.updatedAt).toLocaleDateString()}
                  </span>)}
              </div>
            </div>))}

          {data?.searchEntities?.hasMore && (<div style={{
                    padding: '16px',
                    textAlign: 'center',
                    borderTop: '1px solid var(--hairline)',
                }}>
              <button style={{
                    color: '#1a73e8',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '14px',
                }}>
                Load more results ({data.searchEntities.totalCount} total)
              </button>
            </div>)}
        </div>)}

      {/* Click outside to close */}
      {(showResults || showFilterPanel) && (<div style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 998,
            }} onClick={() => {
                setShowResults(false);
                setShowFilterPanel(false);
            }}/>)}
    </div>);
}
exports.default = AdvancedSearch;
