import React from 'react';
import { GlobalFilter } from '../types';
import { useDashboardStore } from '../store';

export interface FilterBarProps {
  filters: GlobalFilter[];
  pageId: string;
  className?: string;
}

export function FilterBar({ filters, pageId, className = '' }: FilterBarProps) {
  const { updateFilter, removeFilter, editMode } = useDashboardStore();

  const handleFilterChange = (filterId: string, value: any) => {
    updateFilter(pageId, filterId, { value });
  };

  const handleRemoveFilter = (filterId: string) => {
    removeFilter(pageId, filterId);
  };

  if (filters.length === 0) return null;

  return (
    <div className={`filter-bar ${className}`} style={containerStyle}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#6b7280', fontSize: '14px', fontWeight: 500 }}>
        🔍 Filters:
      </div>

      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', flex: 1 }}>
        {filters.map((filter) => (
          <div key={filter.id} style={filterItemStyle}>
            <label style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
              {filter.name}
            </label>

            {filter.type === 'select' && (
              <select
                value={filter.value || ''}
                onChange={(e) => handleFilterChange(filter.id, e.target.value)}
                style={selectStyle}
              >
                <option value="">All</option>
                {filter.options?.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            )}

            {filter.type === 'search' && (
              <input
                type="text"
                value={filter.value || ''}
                onChange={(e) => handleFilterChange(filter.id, e.target.value)}
                placeholder={`Search ${filter.name.toLowerCase()}...`}
                style={inputStyle}
              />
            )}

            {filter.type === 'daterange' && (
              <div style={{ display: 'flex', gap: '4px' }}>
                <input
                  type="date"
                  value={filter.value?.start || ''}
                  onChange={(e) =>
                    handleFilterChange(filter.id, {
                      ...filter.value,
                      start: e.target.value,
                    })
                  }
                  style={inputStyle}
                />
                <span style={{ color: '#9ca3af' }}>to</span>
                <input
                  type="date"
                  value={filter.value?.end || ''}
                  onChange={(e) =>
                    handleFilterChange(filter.id, {
                      ...filter.value,
                      end: e.target.value,
                    })
                  }
                  style={inputStyle}
                />
              </div>
            )}

            {editMode && (
              <button
                onClick={() => handleRemoveFilter(filter.id)}
                style={removeButtonStyle}
                title="Remove filter"
              >
                ×
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

const containerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '16px',
  padding: '12px 24px',
  background: '#f9fafb',
  borderBottom: '1px solid #e5e7eb',
};

const filterItemStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '4px',
  position: 'relative',
};

const selectStyle: React.CSSProperties = {
  padding: '6px 12px',
  border: '1px solid #d1d5db',
  borderRadius: '6px',
  fontSize: '14px',
  background: 'white',
  cursor: 'pointer',
  outline: 'none',
};

const inputStyle: React.CSSProperties = {
  padding: '6px 12px',
  border: '1px solid #d1d5db',
  borderRadius: '6px',
  fontSize: '14px',
  outline: 'none',
};

const removeButtonStyle: React.CSSProperties = {
  position: 'absolute',
  top: '-6px',
  right: '-6px',
  width: '20px',
  height: '20px',
  borderRadius: '50%',
  border: 'none',
  background: '#ef4444',
  color: 'white',
  cursor: 'pointer',
  fontSize: '14px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};
