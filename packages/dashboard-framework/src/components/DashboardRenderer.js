"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DashboardRenderer = DashboardRenderer;
const react_1 = __importDefault(require("react"));
const store_1 = require("../store");
const GridLayout_1 = require("./GridLayout");
const WidgetRenderer_1 = require("./WidgetRenderer");
function DashboardRenderer({ dashboardId, className = '', }) {
    const { getActivePage, editMode, } = (0, store_1.useDashboardStore)();
    const page = getActivePage();
    if (!page) {
        return (<div className="dashboard-renderer-empty" style={emptyStateStyle}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📊</div>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: 600 }}>
            No page selected
          </h3>
          <p style={{ margin: 0, color: '#6b7280', fontSize: '14px' }}>
            Create or select a page to get started
          </p>
        </div>
      </div>);
    }
    if (page.widgets.length === 0) {
        return (<div className="dashboard-renderer-empty" style={emptyStateStyle}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📦</div>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: 600 }}>
            No widgets yet
          </h3>
          <p style={{ margin: 0, color: '#6b7280', fontSize: '14px' }}>
            Add widgets from the widget library to build your dashboard
          </p>
        </div>
      </div>);
    }
    return (<div className={`dashboard-renderer ${className}`} style={containerStyle}>
      <GridLayout_1.GridLayout pageId={page.id} editable={editMode}>
        {page.widgets.map((widget) => (<div key={widget.id} style={widgetContainerStyle}>
            <WidgetRenderer_1.WidgetRenderer widget={widget}/>
          </div>))}
      </GridLayout_1.GridLayout>
    </div>);
}
const containerStyle = {
    width: '100%',
    minHeight: '500px',
    background: '#f9fafb',
    borderRadius: '8px',
};
const widgetContainerStyle = {
    background: 'white',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    overflow: 'hidden',
};
const emptyStateStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '400px',
    padding: '40px',
    color: '#9ca3af',
};
