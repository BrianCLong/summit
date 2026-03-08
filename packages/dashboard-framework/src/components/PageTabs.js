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
exports.PageTabs = PageTabs;
const react_1 = __importStar(require("react"));
const store_1 = require("../store");
function PageTabs({ dashboardId, className = '' }) {
    const [showAddPage, setShowAddPage] = (0, react_1.useState)(false);
    const [newPageName, setNewPageName] = (0, react_1.useState)('');
    const { getActiveDashboard, activePageId, setActivePage, createPage, deletePage, editMode, } = (0, store_1.useDashboardStore)();
    const dashboard = getActiveDashboard();
    if (!dashboard) {
        return null;
    }
    const handleAddPage = () => {
        if (!newPageName.trim()) {
            return;
        }
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
    const handleDeletePage = (pageId, e) => {
        e.stopPropagation();
        if (dashboard.pages.length <= 1) {
            alert('Cannot delete the last page');
            return;
        }
        if (confirm('Are you sure you want to delete this page?')) {
            deletePage(pageId);
        }
    };
    return (<div className={`page-tabs ${className}`} style={containerStyle}>
      <div style={tabsScrollStyle}>
        {dashboard.pages.map((page) => (<div key={page.id} style={{
                ...tabStyle,
                ...(page.id === activePageId ? activeTabStyle : {}),
            }} onClick={() => setActivePage(page.id)}>
            <span>{page.name}</span>
            {editMode && dashboard.pages.length > 1 && (<button onClick={(e) => handleDeletePage(page.id, e)} style={deleteButtonStyle} title="Delete page">
                ×
              </button>)}
          </div>))}

        {editMode && (<>
            {showAddPage ? (<div style={addPageFormStyle}>
                <input type="text" value={newPageName} onChange={(e) => setNewPageName(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleAddPage()} placeholder="Page name..." autoFocus style={inputStyle}/>
                <button onClick={handleAddPage} style={addButtonStyle}>
                  ✓
                </button>
                <button onClick={() => setShowAddPage(false)} style={cancelButtonStyle}>
                  ×
                </button>
              </div>) : (<button onClick={() => setShowAddPage(true)} style={newPageButtonStyle}>
                + New Page
              </button>)}
          </>)}
      </div>
    </div>);
}
const containerStyle = {
    borderBottom: '1px solid #e5e7eb',
    background: 'white',
    padding: '0 16px',
};
const tabsScrollStyle = {
    display: 'flex',
    gap: '4px',
    overflowX: 'auto',
    scrollbarWidth: 'thin',
};
const tabStyle = {
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
const activeTabStyle = {
    color: '#3b82f6',
    borderBottomColor: '#3b82f6',
};
const deleteButtonStyle = {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '20px',
    padding: '0 4px',
    color: '#ef4444',
    opacity: 0.6,
    transition: 'opacity 0.2s',
};
const newPageButtonStyle = {
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
const addPageFormStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '8px',
};
const inputStyle = {
    padding: '6px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    fontSize: '14px',
    outline: 'none',
};
const addButtonStyle = {
    padding: '6px 12px',
    border: 'none',
    borderRadius: '4px',
    background: '#10b981',
    color: 'white',
    cursor: 'pointer',
    fontSize: '14px',
};
const cancelButtonStyle = {
    padding: '6px 12px',
    border: 'none',
    borderRadius: '4px',
    background: '#ef4444',
    color: 'white',
    cursor: 'pointer',
    fontSize: '14px',
};
