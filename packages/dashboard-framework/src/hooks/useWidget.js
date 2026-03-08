"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useWidget = useWidget;
const store_1 = require("../store");
function useWidget(widgetId) {
    const store = (0, store_1.useDashboardStore)();
    return store.getWidget(widgetId);
}
