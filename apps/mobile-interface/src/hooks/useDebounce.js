"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useDebounce = useDebounce;
// @ts-nocheck
const react_1 = require("react");
function useDebounce(value, delay = 300) {
    const [debouncedValue, setDebouncedValue] = (0, react_1.useState)(value);
    (0, react_1.useEffect)(() => {
        const timer = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);
        return () => {
            clearTimeout(timer);
        };
    }, [value, delay]);
    return debouncedValue;
}
