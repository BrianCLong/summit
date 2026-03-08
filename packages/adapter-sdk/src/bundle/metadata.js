"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDefaultSbom = createDefaultSbom;
exports.createDefaultSlsa = createDefaultSlsa;
const node_crypto_1 = require("node:crypto");
function createDefaultSbom(manifest, compatibility) {
    return {
        bomFormat: 'CycloneDX',
        specVersion: '1.5',
        serialNumber: `urn:uuid:${(0, node_crypto_1.randomUUID)()}`,
        metadata: {
            timestamp: new Date().toISOString(),
            tools: [
                {
                    vendor: 'Summit',
                    name: 'adapter-sdk',
                    version: manifest.sdkVersion,
                },
            ],
            component: {
                type: 'application',
                name: manifest.name,
                version: manifest.version,
                description: manifest.description,
                supplier: manifest.maintainer?.name,
            },
        },
        components: [
            {
                type: 'library',
                name: 'adapter-entrypoint',
                version: manifest.version,
                description: 'Adapter entrypoint artifact',
                properties: [
                    { name: 'entrypoint', value: manifest.entrypoint },
                    { name: 'sdkVersion', value: manifest.sdkVersion },
                ],
            },
        ],
        dependencies: Object.entries(compatibility.dependencies ?? {}).map(([name, version]) => ({
            ref: name,
            dependsOn: [],
            version,
        })),
    };
}
function createDefaultSlsa(manifest, payloadDigest) {
    return {
        _type: 'https://slsa.dev/provenance/v1',
        subject: [
            {
                name: manifest.name,
                digest: {
                    sha256: payloadDigest,
                },
            },
        ],
        builder: {
            id: 'https://summit.intelgraph.dev/adapter-sdk',
        },
        buildType: 'https://summit.intelgraph.dev/adapter/bundle',
        invocation: {
            configSource: {
                uri: manifest.entrypoint,
            },
            parameters: {
                version: manifest.version,
                sdk: manifest.sdkVersion,
            },
        },
        metadata: {
            buildStartedOn: new Date().toISOString(),
            completeness: {
                parameters: true,
                materials: true,
                environment: false,
            },
            reproducible: false,
        },
    };
}
