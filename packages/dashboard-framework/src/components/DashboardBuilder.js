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
exports.DashboardBuilder = DashboardBuilder;
const react_1 = __importStar(require("react"));
const store_1 = require("../store");
const DashboardRenderer_1 = require("./DashboardRenderer");
const WidgetToolbar_1 = require("./WidgetToolbar");
const FilterBar_1 = require("./FilterBar");
const PageTabs_1 = require("./PageTabs");
function DashboardBuilder({ dashboardId, widgetTemplates, onSave, onCancel, className = '', }) {
    const [showWidgetLibrary, setShowWidgetLibrary] = (0, react_1.useState)(false);
    const [showSettings, setShowSettings] = (0, react_1.useState)(false);
    const { setActiveDashboard, getActiveDashboard, getActivePage, setEditMode, editMode, addWidget, activePageId, } = (0, store_1.useDashboardStore)();
    react_1.default.useEffect(() => {
        setActiveDashboard(dashboardId);
        setEditMode(true);
    }, [dashboardId, setActiveDashboard, setEditMode]);
    const dashboard = getActiveDashboard();
    const activePage = getActivePage();
    if (!dashboard) {
        return <div className="dashboard-builder-error">Dashboard not found</div>;
    }
    const handleAddWidget = (template) => {
        if (!activePageId) {
            return;
        }
        addWidget(activePageId, {
            type: template.type,
            title: template.name,
            config: template.defaultConfig,
            layout: template.defaultLayout,
        });
        setShowWidgetLibrary(false);
    };
    const handleSave = () => {
        setEditMode(false);
        onSave?.();
    };
    const handleCancel = () => {
        setEditMode(false);
        onCancel?.();
    };
    return (<div className={`dashboard-builder ${className}`}>
      {/* Header */}
      <div className="dashboard-builder-header" style={headerStyle}>
        <div className="dashboard-title" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 600 }}>{dashboard.name}</h2>
          {editMode && (<span style={{
                fontSize: '12px',
                padding: '4px 8px',
                background: '#fef3c7',
                color: '#92400e',
                borderRadius: '4px',
                fontWeight: 500,
            }}>
              Edit Mode
            </span>)}
        </div>

        <div className="dashboard-actions" style={{ display: 'flex', gap: '8px' }}>
          <button onClick={() => setShowWidgetLibrary(!showWidgetLibrary)} style={buttonStyle}>
            + Add Widget
          </button>
          <button onClick={() => setShowSettings(!showSettings)} style={buttonStyle}>
            ⚙️ Settings
          </button>
          <button onClick={handleSave} style={{ ...buttonStyle, background: '#10b981', color: 'white' }}>
            💾 Save
          </button>
          <button onClick={handleCancel} style={{ ...buttonStyle, background: '#6b7280' }}>
            Cancel
          </button>
        </div>
      </div>

      {/* Page Tabs */}
      <PageTabs_1.PageTabs dashboardId={dashboardId}/>

      {/* Filter Bar */}
      {activePage && activePage.filters && activePage.filters.length > 0 && (<FilterBar_1.FilterBar filters={activePage.filters} pageId={activePage.id}/>)}

      {/* Widget Library Panel */}
      {showWidgetLibrary && (<div className="widget-library-panel" style={panelStyle}>
          <div style={{ padding: '16px', borderBottom: '1px solid #e5e7eb' }}>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>Widget Library</h3>
          </div>
          <div style={{ padding: '16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '12px' }}>
            {widgetTemplates.map((template) => (<div key={template.id} className="widget-template" style={templateCardStyle} onClick={() => handleAddWidget(template)}>
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>{template.icon}</div>
                <div style={{ fontSize: '14px', fontWeight: 500, marginBottom: '4px' }}>
                  {template.name}
                </div>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>
                  {template.description}
                </div>
              </div>))}
          </div>
        </div>)}

      {/* Dashboard Renderer */}
      <div className="dashboard-content" style={{ flex: 1, overflow: 'auto', padding: '16px' }}>
        <DashboardRenderer_1.DashboardRenderer dashboardId={dashboardId}/>
      </div>

      {/* Widget Toolbar (for selected widgets) */}
      <WidgetToolbar_1.WidgetToolbar />
    </div>);
}
const headerStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 24px',
    borderBottom: '1px solid #e5e7eb',
    background: 'white',
};
const buttonStyle = {
    padding: '8px 16px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    background: 'white',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 500,
    transition: 'all 0.2s',
};
const panelStyle = {
    position: 'absolute',
    top: '60px',
    right: '16px',
    width: '400px',
    maxHeight: 'calc(100vh - 100px)',
    background: 'white',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
    zIndex: 1000,
    overflow: 'auto',
};
const templateCardStyle = {
    padding: '16px',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    cursor: 'pointer',
    textAlign: 'center',
    transition: 'all 0.2s',
    background: 'white',
};
