"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.useKeyboardShortcuts = useKeyboardShortcuts;
exports.useNavigationShortcuts = useNavigationShortcuts;
exports.useDebouncedValue = useDebouncedValue;
exports.useLiveLogFeed = useLiveLogFeed;
const react_1 = __importDefault(require("react"));
const react_router_dom_1 = require("react-router-dom");
function useKeyboardShortcuts(shortcuts) {
    react_1.default.useEffect(() => {
        function onKey(event) {
            const combo = `${event.metaKey || event.ctrlKey ? 'ctrl+' : ''}${event.shiftKey ? 'shift+' : ''}${event.key.toLowerCase()}`;
            const match = shortcuts.find((shortcut) => shortcut.combo === combo);
            if (match) {
                event.preventDefault();
                match.handler();
            }
        }
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [shortcuts]);
}
function useNavigationShortcuts(basePath = '/') {
    const navigate = (0, react_router_dom_1.useNavigate)();
    react_1.default.useEffect(() => {
        function onSequence(event) {
            if (event.key.toLowerCase() === 'g') {
                const handler = (next) => {
                    const map = {
                        d: `${basePath}dashboard`,
                        p: `${basePath}pipelines`,
                        r: `${basePath}runs/run-1`,
                        o: `${basePath}observability`,
                        l: `${basePath}releases`,
                        a: `${basePath}admin`,
                    };
                    const dest = map[next.key.toLowerCase()];
                    if (dest) {
                        next.preventDefault();
                        navigate(dest);
                    }
                    window.removeEventListener('keydown', handler, true);
                };
                window.addEventListener('keydown', handler, true);
            }
        }
        window.addEventListener('keydown', onSequence);
        return () => window.removeEventListener('keydown', onSequence);
    }, [basePath, navigate]);
}
function useDebouncedValue(value, delayMs) {
    const [debounced, setDebounced] = react_1.default.useState(value);
    react_1.default.useEffect(() => {
        const timeout = setTimeout(() => setDebounced(value), delayMs);
        return () => clearTimeout(timeout);
    }, [value, delayMs]);
    return debounced;
}
function useLiveLogFeed(lines, opts) {
    const { followTail, intervalMs = 300 } = opts;
    const [visible, setVisible] = react_1.default.useState(lines.slice(0, 200));
    const [cursor, setCursor] = react_1.default.useState(200);
    react_1.default.useEffect(() => {
        setVisible(lines.slice(0, 200));
        setCursor(200);
    }, [lines]);
    react_1.default.useEffect(() => {
        if (!followTail)
            return undefined;
        const timer = setInterval(() => {
            setCursor((prevCursor) => {
                const nextCursor = Math.min(lines.length, prevCursor + 10);
                setVisible(lines.slice(0, nextCursor));
                return nextCursor;
            });
        }, intervalMs);
        return () => clearInterval(timer);
    }, [followTail, intervalMs, lines]);
    return visible;
}
