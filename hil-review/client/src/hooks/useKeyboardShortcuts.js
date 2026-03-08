"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useKeyboardShortcuts = useKeyboardShortcuts;
const react_1 = require("react");
const normalize = (event) => {
    const modifiers = [
        event.metaKey ? 'Meta' : '',
        event.ctrlKey ? 'Ctrl' : '',
        event.altKey ? 'Alt' : '',
        event.shiftKey ? 'Shift' : ''
    ]
        .filter(Boolean)
        .join('+');
    const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
    return modifiers ? `${modifiers}+${key}` : key;
};
function useKeyboardShortcuts(map, options = {}) {
    (0, react_1.useEffect)(() => {
        if (options.enabled === false) {
            return () => undefined;
        }
        const handler = (event) => {
            const key = normalize(event);
            const action = map[key];
            if (action) {
                if (options.preventDefault !== false) {
                    event.preventDefault();
                }
                action();
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [map, options.enabled, options.preventDefault]);
}
