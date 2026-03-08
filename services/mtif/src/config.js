"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadConfig = void 0;
const loadConfig = () => {
    const port = Number.parseInt(process.env.MTIF_PORT ?? '8085', 10);
    const signingSecret = process.env.MTIF_SIGNING_SECRET ?? 'mtif-signing-secret';
    const apiRoot = process.env.MTIF_TAXII_ROOT ?? '/taxii2/api-root';
    return { port, signingSecret, apiRoot };
};
exports.loadConfig = loadConfig;
