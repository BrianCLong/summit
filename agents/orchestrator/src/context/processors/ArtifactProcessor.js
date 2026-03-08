"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ArtifactProcessor = void 0;
/**
 * ArtifactProcessor
 *
 * Handles large data objects (Artifacts).
 * By default, provides handles/summaries. Loads content only if requested/configured.
 */
class ArtifactProcessor {
    name = 'ArtifactProcessor';
    async process(context, session, options) {
        // Check session for artifact references
        const artifactRefs = session.metadata?.artifacts || [];
        // In a real implementation, we would fetch artifacts from an ArtifactService
        // For now, we mock the resolution
        // If specific artifacts are requested in options (e.g. by a tool use), load them
        // Otherwise, do nothing (or add summaries to context if we had a place for them)
        // Example logic:
        // 1. Fetch artifacts
        // 2. If options.includeArtifacts is true, append content to context (maybe as system message or user attachment)
        return context;
    }
}
exports.ArtifactProcessor = ArtifactProcessor;
