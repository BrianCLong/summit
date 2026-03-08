"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useKeyboardTrapDetector = useKeyboardTrapDetector;
const react_1 = require("react");
const defaultOptions = {
    threshold: 3,
    onTrap: () => undefined,
};
function useKeyboardTrapDetector(options = defaultOptions) {
    const { threshold, onTrap } = { ...defaultOptions, ...options };
    const [trapSnapshot, setTrapSnapshot] = (0, react_1.useState)(null);
    (0, react_1.useEffect)(() => {
        let lastFocused = null;
        let repeatedTabs = 0;
        const handler = () => {
            const active = document.activeElement;
            if (active && active === lastFocused) {
                repeatedTabs += 1;
            }
            else {
                repeatedTabs = 0;
            }
            lastFocused = active;
            if (repeatedTabs >= threshold && active) {
                const snapshot = {
                    nodeLabel: deriveLabel(active),
                    recentTabStops: repeatedTabs,
                    timestamp: Date.now(),
                };
                setTrapSnapshot(snapshot);
                onTrap(snapshot);
            }
        };
        const listener = (event) => {
            if (event.key === 'Tab') {
                window.setTimeout(handler, 25);
            }
        };
        document.addEventListener('keydown', listener);
        return () => {
            document.removeEventListener('keydown', listener);
        };
    }, [threshold, onTrap]);
    return trapSnapshot;
}
function deriveLabel(node) {
    return (node.getAttribute('aria-label') ||
        node.textContent?.trim() ||
        node.getAttribute('name') ||
        node.id ||
        node.tagName.toLowerCase());
}
