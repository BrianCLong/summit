"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useDebouncedValue = useDebouncedValue;
const react_1 = require("react");
function useDebouncedValue(value, delayMs) {
    const [debounced, setDebounced] = (0, react_1.useState)(value);
    (0, react_1.useEffect)(() => {
        const timeout = window.setTimeout(() => setDebounced(value), delayMs);
        return () => window.clearTimeout(timeout);
    }, [value, delayMs]);
    return debounced;
}
