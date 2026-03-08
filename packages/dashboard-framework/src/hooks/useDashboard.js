"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useDashboard = useDashboard;
exports.useDashboardActions = useDashboardActions;
exports.usePageActions = usePageActions;
const react_1 = require("react");
const store_1 = require("../store");
function useDashboard(dashboardId) {
    const store = (0, store_1.useDashboardStore)();
    (0, react_1.useEffect)(() => {
        if (dashboardId) {
            store.setActiveDashboard(dashboardId);
        }
    }, [dashboardId, store]);
    return {
        dashboard: store.getActiveDashboard(),
        activePage: store.getActivePage(),
        ...store,
    };
}
function useDashboardActions() {
    const store = (0, store_1.useDashboardStore)();
    return {
        createDashboard: store.createDashboard,
        updateDashboard: store.updateDashboard,
        deleteDashboard: store.deleteDashboard,
        duplicateDashboard: store.duplicateDashboard,
        setActiveDashboard: store.setActiveDashboard,
        setEditMode: store.setEditMode,
    };
}
function usePageActions() {
    const store = (0, store_1.useDashboardStore)();
    return {
        createPage: store.createPage,
        updatePage: store.updatePage,
        deletePage: store.deletePage,
        setActivePage: store.setActivePage,
        reorderPages: store.reorderPages,
    };
}
