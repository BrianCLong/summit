"use strict";
/**
 * Basic placeholders for future federation features.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerSubgraph = registerSubgraph;
exports.federationStatus = federationStatus;
function registerSubgraph(name, url) {
    return { name, url };
}
function federationStatus() {
    return 'ok';
}
