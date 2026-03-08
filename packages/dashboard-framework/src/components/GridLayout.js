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
exports.GridLayout = GridLayout;
const react_1 = __importStar(require("react"));
const react_grid_layout_1 = __importStar(require("react-grid-layout"));
require("react-grid-layout/css/styles.css");
require("react-resizable/css/styles.css");
const store_1 = require("../store");
const ReactGridLayout = (0, react_grid_layout_1.WidthProvider)(react_grid_layout_1.default);
function GridLayout({ pageId, children, editable = false, className = '', }) {
    const { getActivePage, updateWidgetLayout, } = (0, store_1.useDashboardStore)();
    const page = getActivePage();
    if (!page) {
        return <div>Page not found</div>;
    }
    const { layout: layoutConfig, widgets } = page;
    // Convert widget layouts to react-grid-layout format
    const layouts = widgets.map(widget => ({
        i: widget.id,
        x: widget.layout.x,
        y: widget.layout.y,
        w: widget.layout.w,
        h: widget.layout.h,
        minW: widget.layout.minW,
        minH: widget.layout.minH,
        maxW: widget.layout.maxW,
        maxH: widget.layout.maxH,
        static: widget.layout.static || !editable,
        isDraggable: widget.layout.isDraggable !== false && editable,
        isResizable: widget.layout.isResizable !== false && editable,
    }));
    const handleLayoutChange = (0, react_1.useCallback)((newLayout) => {
        if (!editable) {
            return;
        }
        newLayout.forEach(item => {
            const widget = widgets.find(w => w.id === item.i);
            if (widget) {
                const layoutUpdate = {
                    x: item.x,
                    y: item.y,
                    w: item.w,
                    h: item.h,
                };
                // Only update if changed
                if (widget.layout.x !== item.x ||
                    widget.layout.y !== item.y ||
                    widget.layout.w !== item.w ||
                    widget.layout.h !== item.h) {
                    updateWidgetLayout(widget.id, layoutUpdate);
                }
            }
        });
    }, [widgets, updateWidgetLayout, editable]);
    const handleDrag = (0, react_1.useCallback)((layout, oldItem, newItem) => {
        // Optional: Add drag feedback
    }, []);
    const handleResize = (0, react_1.useCallback)((layout, oldItem, newItem) => {
        // Optional: Add resize feedback
    }, []);
    return (<ReactGridLayout className={`dashboard-grid-layout ${className}`} layout={layouts} cols={layoutConfig.columns || 12} rowHeight={layoutConfig.rowHeight || 80} margin={layoutConfig.gaps ? [layoutConfig.gaps.x, layoutConfig.gaps.y] : [16, 16]} containerPadding={layoutConfig.margin ? [layoutConfig.margin.x, layoutConfig.margin.y] : [0, 0]} compactType={layoutConfig.compactType || 'vertical'} preventCollision={layoutConfig.preventCollision || false} isDraggable={editable} isResizable={editable} onLayoutChange={handleLayoutChange} onDrag={handleDrag} onResize={handleResize} draggableHandle=".widget-drag-handle" resizeHandles={['se', 'sw', 'ne', 'nw']} style={{
            minHeight: '100%',
        }}>
      {children}
    </ReactGridLayout>);
}
