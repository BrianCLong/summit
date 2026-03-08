"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useSafeQuery = useSafeQuery;
const react_1 = require("react");
// Minimal safe query wrapper. In production, generated hooks should be used.
// While codegen is pending, this wrapper can return mocked data in DEV/tests.
function useSafeQuery({ queryKey, fetcher, mock, deps = [], }) {
    const [data, setData] = (0, react_1.useState)(undefined);
    const [loading, setLoading] = (0, react_1.useState)(true);
    const [error, setError] = (0, react_1.useState)(null);
    const shouldMock = import.meta.env?.DEV || process.env.NODE_ENV === 'test';
    const memoDeps = (0, react_1.useMemo)(() => deps, deps);
    (0, react_1.useEffect)(() => {
        let mounted = true;
        async function run() {
            setLoading(true);
            try {
                if (shouldMock && mock !== undefined) {
                    await new Promise((r) => setTimeout(r, 10));
                    if (mounted)
                        setData(mock);
                }
                else if (fetcher) {
                    const res = await fetcher();
                    if (mounted)
                        setData(res);
                }
                else {
                    if (mounted)
                        setData(undefined);
                }
                if (mounted)
                    setError(null);
            }
            catch (e) {
                if (mounted)
                    setError(e);
            }
            finally {
                if (mounted)
                    setLoading(false);
                // DEV-only telemetry stub
                if (shouldMock) {
                    window.__ui_metrics = window.__ui_metrics || {};
                    window.__ui_metrics[queryKey] =
                        (window.__ui_metrics[queryKey] || 0) + 1;
                }
            }
        }
        run();
        return () => {
            mounted = false;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, memoDeps);
    return { data, loading, error };
}
