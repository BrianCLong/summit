import React, { useState } from 'react';
import { useDashboardStore } from '../store';

export interface PageTabsProps {
  dashboardId: string;
  className?: string;
}

export function PageTabs({ dashboardId, className = '' }: PageTabsProps) {
  const [showAddPage, setShowAddPage] = useState(false);
  const [newPageName, setNewPageName] = useState('');

  const {
    getActiveDashboard,
    activePageId,
    setActivePage,
    createPage,
    deletePage,
    editMode,
  } = useDashboardStore();

  const dashboard = getActiveDashboard();

  if (!dashboard) return null;

  const handleAddPage = () => {
    if (!newPageName.trim()) return;

    createPage(dashboardId, {
      name: newPageName,
      layout: {
        type: 'grid',
        columns: 12,
        rowHeight: 80,
      },
      widgets: [],
    });

    setNewPageName('');
    setShowAddPage(false);
  };

  const handleDeletePage = (pageId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (dashboard.pages.length <= 1) {
      alert('Cannot delete the last page');
      return;
    }
    if (confirm('Are you sure you want to delete this page?')) {
      deletePage(pageId);
    }
  };

  return (
    <div className={`page-tabs ${className}`} style={containerStyle}>
      <div style={tabsScrollStyle}>
        {dashboard.pages.map((page) => (
          <div
            key={page.id}
            style={{
              ...tabStyle,
              ...(page.id === activePageId ? activeTabStyle : {}),
            }}
            onClick={() => setActivePage(page.id)}
          >
            <span>{page.name}</span>
            {editMode && dashboard.pages.length > 1 && (
              <button
                onClick={(e) => handleDeletePage(page.id, e)}
                style={deleteButtonStyle}
                title="Delete page"
              >
                ×
              </button>
            )}
          </div>
        ))}

        {editMode && (
          <>
            {showAddPage ? (
              <div style={addPageFormStyle}>
                <input
                  type="text"
                  value={newPageName}
                  onChange={(e) => setNewPageName(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddPage()}
                  placeholder="Page name..."
                  autoFocus
                  style={inputStyle}
                />
                <button onClick={handleAddPage} style={addButtonStyle}>
                  ✓
                </button>
                <button onClick={() => setShowAddPage(false)} style={cancelButtonStyle}>
                  ×
                </button>
              </div>
            ) : (
              <button onClick={() => setShowAddPage(true)} style={newPageButtonStyle}>
                + New Page
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

const containerStyle: React.CSSProperties = {
  borderBottom: '1px solid #e5e7eb',
  background: 'white',
  padding: '0 16px',
};

const tabsScrollStyle: React.CSSProperties = {
  display: 'flex',
  gap: '4px',
  overflowX: 'auto',
  scrollbarWidth: 'thin',
};

const tabStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  padding: '12px 16px',
  border: 'none',
  background: 'transparent',
  cursor: 'pointer',
  fontSize: '14px',
  fontWeight: 500,
  color: '#6b7280',
  borderBottom: '2px solid transparent',
  transition: 'all 0.2s',
  whiteSpace: 'nowrap',
};

const activeTabStyle: React.CSSProperties = {
  color: '#3b82f6',
  borderBottomColor: '#3b82f6',
};

const deleteButtonStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  fontSize: '20px',
  padding: '0 4px',
  color: '#ef4444',
  opacity: 0.6,
  transition: 'opacity 0.2s',
};

const newPageButtonStyle: React.CSSProperties = {
  padding: '8px 16px',
  border: '1px dashed #d1d5db',
  borderRadius: '6px',
  background: 'transparent',
  cursor: 'pointer',
  fontSize: '13px',
  color: '#6b7280',
  transition: 'all 0.2s',
  whiteSpace: 'nowrap',
};

const addPageFormStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '4px',
  padding: '8px',
};

const inputStyle: React.CSSProperties = {
  padding: '6px 12px',
  border: '1px solid #d1d5db',
  borderRadius: '4px',
  fontSize: '14px',
  outline: 'none',
};

const addButtonStyle: React.CSSProperties = {
  padding: '6px 12px',
  border: 'none',
  borderRadius: '4px',
  background: '#10b981',
  color: 'white',
  cursor: 'pointer',
  fontSize: '14px',
};

const cancelButtonStyle: React.CSSProperties = {
  padding: '6px 12px',
  border: 'none',
  borderRadius: '4px',
  background: '#ef4444',
  color: 'white',
  cursor: 'pointer',
  fontSize: '14px',
};
