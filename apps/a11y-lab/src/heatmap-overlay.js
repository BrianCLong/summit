"use strict";
/*
 * Runtime A11y heatmap overlay. This is analytics-free and only operates on in-memory axe findings.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.teardownHeatmap = teardownHeatmap;
exports.renderHeatmap = renderHeatmap;
exports.toggleA11yHeatmap = toggleA11yHeatmap;
exports.getHeatmapSnippet = getHeatmapSnippet;
const OVERLAY_ID = 'a11y-heatmap-overlay';
const SCALE = ['#009688', '#4CAF50', '#FFC107', '#FF7043', '#E53935'];
function bucket(impact) {
    switch (impact) {
        case 'minor':
            return 1;
        case 'moderate':
            return 2;
        case 'serious':
            return 3;
        case 'critical':
            return 4;
        default:
            return 0;
    }
}
function teardownHeatmap() {
    const overlay = document.getElementById(OVERLAY_ID);
    if (overlay) {
        overlay.remove();
    }
}
function renderBadge(target, color, tooltip) {
    const badge = document.createElement('span');
    badge.textContent = '●';
    badge.style.position = 'absolute';
    badge.style.top = '0';
    badge.style.right = '0';
    badge.style.transform = 'translate(50%, -50%)';
    badge.style.color = color;
    badge.style.fontSize = '1.1rem';
    badge.style.textShadow = '0 0 2px #000';
    badge.title = tooltip;
    return badge;
}
function decorateNode(node, score, violation) {
    const rect = node.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0)
        return;
    const overlay = document.getElementById(OVERLAY_ID);
    if (!overlay)
        return;
    const wrapper = document.createElement('div');
    wrapper.style.position = 'absolute';
    wrapper.style.left = `${rect.left + window.scrollX}px`;
    wrapper.style.top = `${rect.top + window.scrollY}px`;
    wrapper.style.width = `${rect.width}px`;
    wrapper.style.height = `${rect.height}px`;
    wrapper.style.pointerEvents = 'none';
    wrapper.style.outline = `2px solid ${SCALE[Math.min(score, SCALE.length - 1)]}`;
    wrapper.style.outlineOffset = '2px';
    wrapper.style.boxShadow = '0 0 8px rgba(0,0,0,0.4)';
    const badge = renderBadge(node, SCALE[Math.min(score, SCALE.length - 1)], `${violation.id}: ${violation.description}`);
    wrapper.appendChild(badge);
    overlay.appendChild(wrapper);
}
function renderHeatmap(results) {
    teardownHeatmap();
    const overlay = document.createElement('div');
    overlay.id = OVERLAY_ID;
    overlay.style.position = 'absolute';
    overlay.style.left = '0';
    overlay.style.top = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.pointerEvents = 'none';
    overlay.style.zIndex = '999999';
    document.body.appendChild(overlay);
    if (!results)
        return;
    const violations = results.violations.map(({ impact, nodes, id, description }) => ({
        impact,
        nodes,
        id,
        description,
    }));
    for (const violation of violations) {
        const score = bucket(violation.impact);
        violation.nodes.forEach((node) => {
            node.targets
                .flat()
                .map((selector) => document.querySelector(selector))
                .filter((el) => Boolean(el))
                .forEach((el) => decorateNode(el, score, violation));
        });
    }
}
function toggleA11yHeatmap(results) {
    const overlay = document.getElementById(OVERLAY_ID);
    if (overlay) {
        teardownHeatmap();
    }
    else {
        renderHeatmap(results);
    }
}
function getHeatmapSnippet(results) {
    const source = `(() => { ${renderHeatmap.toString()} ${teardownHeatmap.toString()} ${bucket.toString()} ${decorateNode.toString()} ${renderBadge.toString()} (${toggleA11yHeatmap.toString()})(window.__AXE_RESULTS__); })();`;
    const payload = results ? `window.__AXE_RESULTS__ = ${JSON.stringify(results)};` : '';
    return `${payload}${source}`;
}
