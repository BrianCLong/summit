import { verifySignature } from './verify';
export class PluginHost {
    async load(manifest, filePath) {
        await verifySignature(manifest, filePath);
        return { manifest };
    }
}
//# sourceMappingURL=PluginHost.js.map