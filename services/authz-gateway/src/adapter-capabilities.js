"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAdapterManifest = getAdapterManifest;
exports.missingAdapterPermissions = missingAdapterPermissions;
exports.buildAdapterResource = buildAdapterResource;
// @ts-nocheck
const adapter_manifest_json_1 = __importDefault(require("./data/adapter-manifest.json"));
const manifestIndex = Object.fromEntries(adapter_manifest_json_1.default.map((entry) => [entry.id, entry]));
function getAdapterManifest(adapterId) {
    return manifestIndex[adapterId];
}
function missingAdapterPermissions(subject, adapter) {
    return (adapter.requiredPermissions || []).filter((perm) => !subject.entitlements.includes(perm));
}
function buildAdapterResource(adapter, subject, resource) {
    const fallback = {
        id: adapter.id,
        tenantId: resource?.tenantId || subject.tenantId,
        residency: resource?.residency || subject.residency,
        classification: resource?.classification || subject.clearance,
        tags: resource?.tags || [],
        claims: adapter.claims ?? {},
        requiredPermissions: adapter.requiredPermissions ?? [],
        adapterId: adapter.id,
        capabilities: adapter.capabilities ?? [],
    };
    if (!resource) {
        return fallback;
    }
    return {
        ...fallback,
        ...resource,
        tags: resource.tags ?? fallback.tags,
        claims: {
            ...(fallback.claims ?? {}),
            ...(resource.claims ?? {}),
        },
        requiredPermissions: resource.requiredPermissions ?? fallback.requiredPermissions,
        capabilities: resource.capabilities ?? fallback.capabilities,
        adapterId: resource.adapterId ?? fallback.adapterId,
    };
}
