"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useDebounce = useDebounce;
const react_1 = require("react");
/**
 * A hook that returns a debounced version of the value that delays updating state
 * until the delay has passed. This is useful for preventing expensive operations
 * (like search or API calls) from running on every keystroke.
 *
 * @param value The value to debounce
 * @param delay The delay in milliseconds
 * @returns The debounced value
 */
function useDebounce(value, delay) {
    const [debouncedValue, setDebouncedValue] = (0, react_1.useState)(value);
    (0, react_1.useEffect)(() => {
        // Update debounced value after delay
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);
        // Cancel the timeout if value changes (also on component unmount)
        // This is how we prevent debounced value from updating if value is changed ...
        // ... within the delay period. Timeout gets cleared and restarted.
        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);
    return debouncedValue;
}
