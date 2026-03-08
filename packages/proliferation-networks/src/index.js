"use strict";
/**
 * Proliferation Networks Package
 *
 * Tracks illicit procurement networks, smuggling routes,
 * and technology transfer for WMD proliferation.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FinancialTracker = exports.ProcurementMonitor = exports.NetworkTracker = void 0;
__exportStar(require("./types.js"), exports);
__exportStar(require("./network-tracker.js"), exports);
__exportStar(require("./procurement-monitor.js"), exports);
__exportStar(require("./financial-tracker.js"), exports);
class NetworkTracker {
    networks = new Map();
    registerNetwork(network) {
        this.networks.set(network.id, network);
    }
    getActiveNetworks() {
        return Array.from(this.networks.values()).filter(n => n.status === 'active');
    }
    trackMaterial(material) {
        return Array.from(this.networks.values())
            .filter(n => n.materials_sought.includes(material));
    }
    identifyKeyActors() {
        const actors = [];
        this.networks.forEach(n => actors.push(...n.key_actors));
        return actors.filter(a => a.sanctions === false); // Unsanctioned actors
    }
}
exports.NetworkTracker = NetworkTracker;
class ProcurementMonitor {
    activities = [];
    recordActivity(activity) {
        this.activities.push(activity);
    }
    getActivitiesByCategory(category) {
        return this.activities.filter(a => a.item_category === category);
    }
    identifyDualUsePatterns() {
        const items = this.activities
            .filter(a => a.item_category === 'dual_use')
            .reduce((acc, a) => {
            acc[a.item_sought] = (acc[a.item_sought] || 0) + 1;
            return acc;
        }, {});
        return Object.entries(items).map(([item, count]) => ({ item, count }));
    }
}
exports.ProcurementMonitor = ProcurementMonitor;
class FinancialTracker {
    nodes = [];
    addNode(node) {
        this.nodes.push(node);
    }
    identifyShellCompanies() {
        return this.nodes.filter(n => n.entity_type === 'shell_company');
    }
    trackTransactionFlow(entity) {
        const related = this.nodes.filter(n => n.entity_name === entity);
        const total = related.reduce((sum, n) => sum + (n.transactions_value || 0), 0);
        return { total_value: total, connections: related.map(n => n.country) };
    }
}
exports.FinancialTracker = FinancialTracker;
