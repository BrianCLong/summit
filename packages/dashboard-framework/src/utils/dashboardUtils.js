"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateOptimalLayout = calculateOptimalLayout;
exports.validateDashboard = validateDashboard;
exports.cloneDashboard = cloneDashboard;
exports.mergeDashboards = mergeDashboards;
function calculateOptimalLayout(widgets, columns = 12) {
    // Simple algorithm to optimize widget placement
    const sorted = [...widgets].sort((a, b) => {
        if (a.layout.y !== b.layout.y) {
            return a.layout.y - b.layout.y;
        }
        return a.layout.x - b.layout.x;
    });
    let currentY = 0;
    let currentX = 0;
    return sorted.map((widget) => {
        const w = widget.layout.w;
        const h = widget.layout.h;
        if (currentX + w > columns) {
            currentY++;
            currentX = 0;
        }
        const newLayout = {
            ...widget.layout,
            x: currentX,
            y: currentY,
        };
        currentX += w;
        return {
            ...widget,
            layout: newLayout,
        };
    });
}
function validateDashboard(dashboard) {
    const errors = [];
    if (!dashboard.name || dashboard.name.trim() === '') {
        errors.push('Dashboard name is required');
    }
    if (!dashboard.pages || dashboard.pages.length === 0) {
        errors.push('Dashboard must have at least one page');
    }
    dashboard.pages.forEach((page, index) => {
        if (!page.name || page.name.trim() === '') {
            errors.push(`Page ${index + 1} must have a name`);
        }
        page.widgets.forEach((widget, widgetIndex) => {
            if (!widget.type) {
                errors.push(`Widget ${widgetIndex + 1} on page "${page.name}" must have a type`);
            }
            if (widget.layout.w <= 0 || widget.layout.h <= 0) {
                errors.push(`Widget "${widget.title}" on page "${page.name}" has invalid dimensions`);
            }
        });
    });
    return {
        valid: errors.length === 0,
        errors,
    };
}
function cloneDashboard(dashboard) {
    return JSON.parse(JSON.stringify(dashboard));
}
function mergeDashboards(target, source) {
    return {
        ...target,
        pages: [...target.pages, ...source.pages.map((p, i) => ({
                ...p,
                id: `${p.id}-merged`,
                order: target.pages.length + i,
            }))],
        updatedAt: new Date(),
        version: target.version + 1,
    };
}
