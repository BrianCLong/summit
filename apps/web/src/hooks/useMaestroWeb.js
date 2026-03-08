"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useWebInterfaces = useWebInterfaces;
exports.useOrchestrateWeb = useOrchestrateWeb;
// =============================================
// File: apps/web/src/hooks/useMaestroWeb.ts
// =============================================
const react_query_1 = require("@tanstack/react-query");
const maestroApi_1 = require("../lib/maestroApi");
function useWebInterfaces() {
    return (0, react_query_1.useQuery)({
        queryKey: ['maestro', 'webInterfaces'],
        queryFn: () => maestroApi_1.maestroApi.webInterfaces(),
    });
}
function useOrchestrateWeb() {
    return (0, react_query_1.useMutation)({
        mutationFn: ({ task, interfaces }) => maestroApi_1.maestroApi.orchestrateWeb(task, interfaces),
    });
}
