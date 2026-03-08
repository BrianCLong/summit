"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.attachGraphFocusBridge = attachGraphFocusBridge;
const jquery_1 = __importDefault(require("jquery"));
function attachGraphFocusBridge(cy) {
    const $c = (0, jquery_1.default)(cy.container());
    cy.on('boxstart', () => $c.trigger('intelgraph:graph:lasso_start'));
    cy.on('boxend', () => $c.trigger('intelgraph:graph:lasso_end'));
}
