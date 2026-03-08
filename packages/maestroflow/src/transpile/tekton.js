"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toTekton = toTekton;
function toTekton(flow) {
    const tasks = flow.nodes.map((n) => ({ apiVersion: "tekton.dev/v1beta1", kind: "Task", metadata: { name: n.id },
        spec: { steps: [{ name: `${n.type}`, image: "node:18", script: n.type === "build" ? "pnpm i && pnpm build" : "npx jest --ci" }] } }));
    const pipeline = { apiVersion: "tekton.dev/v1beta1", kind: "Pipeline", metadata: { name: flow.name },
        spec: { tasks: flow.nodes.map((n) => ({ name: n.id, taskRef: { name: n.id }, runAfter: flow.edges.filter((e) => e.to === n.id).map((e) => e.from) })) } };
    return { tasks, pipeline };
}
