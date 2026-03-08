"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_path_1 = __importDefault(require("node:path"));
const node_url_1 = require("node:url");
const config_1 = require("vitest/config");
const stubCommonTypes = node_path_1.default.resolve(node_path_1.default.dirname((0, node_url_1.fileURLToPath)(import.meta.url)), 'test-common-types.stub.js');
exports.default = (0, config_1.defineConfig)({
    resolve: {
        alias: {
            '@ga-graphai/common-types': stubCommonTypes,
        },
    },
    test: {
        coverage: {
            provider: 'istanbul',
            reporter: ['text', 'json'],
            thresholds: {
                lines: 85,
                statements: 85,
                branches: 80,
                functions: 85,
            },
            include: [
                'src/search/**',
                'src/privacy/**',
                'src/drift/**',
                'src/versioning/**',
            ],
        },
        deps: {
            registerNodeLoader: true,
            optimizer: {
                ssr: {
                    include: ['@ga-graphai/common-types', '@ga-graphai/query-copilot'],
                },
            },
        },
        ssr: {
            noExternal: ['@ga-graphai/common-types', '@ga-graphai/query-copilot'],
        },
        server: {
            deps: {
                inline: [
                    /^@ga-graphai\/common-types/,
                    /^@ga-graphai\/query-copilot/,
                ],
            },
        },
    },
});
