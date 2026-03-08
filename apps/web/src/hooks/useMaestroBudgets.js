"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useBudgets = useBudgets;
// =============================================
// File: apps/web/src/hooks/useMaestroBudgets.ts
// =============================================
const react_query_1 = require("@tanstack/react-query");
const maestroApi_1 = require("../lib/maestroApi");
function useBudgets() {
    return (0, react_query_1.useQuery)({
        queryKey: ['maestro', 'budgets'],
        queryFn: () => maestroApi_1.maestroApi.budgets(),
        staleTime: 60_000,
    });
}
