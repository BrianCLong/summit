"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useRestoreFocus = useRestoreFocus;
const react_1 = require("react");
function useRestoreFocus(isOpen, options = {}) {
    const { enabled = true, fallbackRef } = options;
    const wasOpenRef = (0, react_1.useRef)(isOpen);
    const previouslyFocusedRef = (0, react_1.useRef)(null);
    (0, react_1.useEffect)(() => {
        if (!enabled) {
            return;
        }
        if (isOpen) {
            previouslyFocusedRef.current =
                document.activeElement instanceof HTMLElement &&
                    document.activeElement !== document.body
                    ? document.activeElement
                    : null;
        }
        else if (wasOpenRef.current) {
            if (previouslyFocusedRef.current) {
                previouslyFocusedRef.current.focus({ preventScroll: true });
            }
            else if (fallbackRef?.current) {
                fallbackRef.current.focus({ preventScroll: true });
            }
        }
        wasOpenRef.current = isOpen;
    }, [enabled, fallbackRef, isOpen]);
    return previouslyFocusedRef;
}
exports.default = useRestoreFocus;
