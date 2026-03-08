"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useLogs = useLogs;
// =============================================
// File: apps/web/src/hooks/useMaestroLogs.ts
// =============================================
const react_1 = require("react");
const maestroApi_1 = require("../lib/maestroApi");
function useLogs() {
    const [events, setEvents] = (0, react_1.useState)([]);
    const disposer = (0, react_1.useRef)(null);
    (0, react_1.useEffect)(() => {
        disposer.current = maestroApi_1.maestroApi.logsStream(e => setEvents(prev => [e, ...prev].slice(0, 500)));
        return () => {
            if (disposer.current) {
                disposer.current();
            }
        };
    }, []);
    const stats = (0, react_1.useMemo)(() => {
        const c = { info: 0, warn: 0, error: 0 };
        events.forEach(e => {
            c[e.level]++;
        });
        return c;
    }, [events]);
    return { events, stats };
}
