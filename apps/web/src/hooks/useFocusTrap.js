"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = useFocusTrap;
// =============================================
// Focus Trap Hook for A11y Modal/Dialog Support
// =============================================
const react_1 = require("react");
const FOCUSABLE_ELEMENTS = [
    'a[href]',
    'area[href]',
    'input:not([disabled]):not([type="hidden"])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    'button:not([disabled])',
    'iframe',
    'object',
    'embed',
    '[contenteditable]',
    '[tabindex]:not([tabindex^="-"])',
];
function useFocusTrap(containerRef, active) {
    (0, react_1.useEffect)(() => {
        if (!active || !containerRef.current) {
            return;
        }
        const container = containerRef.current;
        const focusableElements = container.querySelectorAll(FOCUSABLE_ELEMENTS.join(','));
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];
        // Focus first element on mount
        if (firstElement) {
            firstElement.focus();
        }
        const handleTabKey = (e) => {
            if (e.key !== 'Tab') {
                return;
            }
            if (e.shiftKey) {
                // Shift + Tab
                if (document.activeElement === firstElement) {
                    lastElement?.focus();
                    e.preventDefault();
                }
            }
            else {
                // Tab
                if (document.activeElement === lastElement) {
                    firstElement?.focus();
                    e.preventDefault();
                }
            }
        };
        container.addEventListener('keydown', handleTabKey);
        return () => {
            container.removeEventListener('keydown', handleTabKey);
        };
    }, [active, containerRef]);
}
