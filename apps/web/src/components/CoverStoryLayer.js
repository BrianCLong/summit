"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CoverStoryLayer = CoverStoryLayer;
const react_1 = require("react");
const react_redux_1 = require("react-redux");
// Palantir-ish / Gotham-ish theme colors
const GOTHAM_THEME = {
    '--background': '#101113',
    '--foreground': '#c1c7cd',
    '--primary': '#3392fd',
    '--primary-foreground': '#ffffff',
    '--secondary': '#202226',
    '--secondary-foreground': '#ffffff',
    '--muted': '#2c3138',
    '--muted-foreground': '#878f96',
    '--accent': '#3392fd',
    '--accent-foreground': '#ffffff',
    '--destructive': '#d04444',
    '--destructive-foreground': '#ffffff',
    '--border': '#2c3138',
    '--input': '#202226',
    '--ring': '#3392fd',
    '--radius': '0px', // Gotham likes sharp edges
};
function CoverStoryLayer() {
    const { coverStoryMode } = (0, react_redux_1.useSelector)((state) => state.ui);
    (0, react_1.useEffect)(() => {
        if (coverStoryMode) {
            const root = document.documentElement;
            const originalStyles = {};
            // Save original styles and apply Gotham
            Object.entries(GOTHAM_THEME).forEach(([key, value]) => {
                originalStyles[key] = root.style.getPropertyValue(key);
                root.style.setProperty(key, value);
            });
            // Add a class for specific overrides that CSS vars can't handle
            document.body.classList.add('gotham-mode');
            return () => {
                // Revert
                Object.entries(originalStyles).forEach(([key, value]) => {
                    if (value)
                        root.style.setProperty(key, value);
                    else
                        root.style.removeProperty(key);
                });
                document.body.classList.remove('gotham-mode');
            };
        }
    }, [coverStoryMode]);
    return null;
}
