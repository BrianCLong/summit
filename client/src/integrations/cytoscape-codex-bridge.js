"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.attachCodexBridge = attachCodexBridge;
const jquery_1 = __importDefault(require("jquery"));
function attachCodexBridge(cy, onAdd) {
    const $container = (0, jquery_1.default)(cy.container());
    cy.on('select', 'node', (evt) => {
        const node = evt.target.data();
        $container.trigger('intelgraph:node_selected', [node]);
    });
    $container.on('intelgraph:add_to_codex', (_e, node) => {
        onAdd({
            type: 'entity',
            entityId: node.id,
            title: node.label,
            provenance: {
                sourceId: node.sourceId,
                link: `/entity/${node.id}`,
                capturedAt: new Date().toISOString(),
            },
        });
    });
}
