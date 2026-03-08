"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSandbox = createSandbox;
exports.teardownSandbox = teardownSandbox;
const client_node_1 = __importDefault(require("@kubernetes/client-node"));
const kc = new client_node_1.default.KubeConfig();
try {
    kc.loadFromDefault();
}
catch { }
const core = kc.makeApiClient(client_node_1.default.CoreV1Api);
const net = kc.makeApiClient(client_node_1.default.NetworkingV1Api);
async function createSandbox(runId, allow) {
    const ns = `rb-${runId.slice(0, 8)}`;
    await core.createNamespace({
        metadata: { name: ns, labels: { 'maestro.run': runId } },
    });
    await net.createNamespacedNetworkPolicy(ns, {
        metadata: { name: 'egress-allow' },
        spec: {
            podSelector: {},
            policyTypes: ['Egress'],
            egress: allow.map(toNetRule),
        },
    });
    return ns;
}
async function teardownSandbox(ns) {
    await core.deleteNamespace(ns);
}
function toNetRule(_s) {
    return { to: [{ ipBlock: { cidr: '0.0.0.0/0' } }] };
}
