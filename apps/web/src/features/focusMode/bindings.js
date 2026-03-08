"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bindFocusMode = bindFocusMode;
const focusSlice_1 = require("./focusSlice");
function bindFocusMode($root, dispatch) {
    // Hotkey: F toggles manual, spotlight current hovered pane
    $root.on('keydown', (e) => {
        const nativeEvent = e.originalEvent;
        if (nativeEvent.code === 'KeyF' && !nativeEvent.repeat) {
            const region = currentRegionFromHover();
            dispatch((0, focusSlice_1.toggleManual)({ region }));
            $root.trigger('intelgraph:focus:toggled', [region]);
        }
    });
    // Auto triggers from integrations
    $root.on('intelgraph:graph:lasso_start', () => dispatch((0, focusSlice_1.enterFocus)({ region: 'graph', reason: 'lasso' })));
    $root.on('intelgraph:graph:lasso_end', () => dispatch((0, focusSlice_1.exitFocus)()));
    $root.on('intelgraph:codex:edit_start', () => dispatch((0, focusSlice_1.enterFocus)({ region: 'codex', reason: 'codex-edit' })));
    $root.on('intelgraph:codex:edit_end', () => dispatch((0, focusSlice_1.exitFocus)()));
    $root.on('intelgraph:map:draw_start', () => dispatch((0, focusSlice_1.enterFocus)({ region: 'map', reason: 'map-draw' })));
    $root.on('intelgraph:map:draw_end', () => dispatch((0, focusSlice_1.exitFocus)()));
    $root.on('intelgraph:timeline:range_drag_start', () => dispatch((0, focusSlice_1.enterFocus)({ region: 'timeline', reason: 'brush' })));
    $root.on('intelgraph:timeline:range_drag_end', () => dispatch((0, focusSlice_1.exitFocus)()));
}
function currentRegionFromHover() {
    const el = document.elementFromPoint(window.innerWidth / 2, window.innerHeight / 2);
    if (!el) {
        return 'graph';
    }
    if (el.closest('#pane-codex')) {
        return 'codex';
    }
    if (el.closest('#pane-map')) {
        return 'map';
    }
    if (el.closest('#pane-timeline')) {
        return 'timeline';
    }
    return 'graph';
}
