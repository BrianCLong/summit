"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useRoutePreview = useRoutePreview;
exports.useRouteExecute = useRouteExecute;
// =============================================
// File: apps/web/src/hooks/useMaestroRouting.ts
// =============================================
const react_query_1 = require("@tanstack/react-query");
const maestroApi_1 = require("../lib/maestroApi");
function useRoutePreview(task, enabled) {
    return (0, react_query_1.useQuery)({
        queryKey: ['maestro', 'routePreview', task],
        queryFn: () => maestroApi_1.maestroApi.routePreview(task),
        enabled: enabled && Boolean(task?.trim()),
    });
}
function useRouteExecute() {
    return (0, react_query_1.useMutation)({
        mutationFn: ({ task, selection }) => maestroApi_1.maestroApi.routeExecute(task, selection),
    });
}
