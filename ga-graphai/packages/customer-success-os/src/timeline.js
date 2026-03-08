"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.summarizeTimeline = summarizeTimeline;
function hoursSince(date, now) {
    return Math.round((now.getTime() - date.getTime()) / (1000 * 60 * 60));
}
function summarizeTimeline(timeline, now = new Date()) {
    let stalledReference;
    let lastValueProof;
    let deployments = 0;
    let incidents = 0;
    let configChanges = 0;
    let recipesCompleted = 0;
    timeline.forEach((event) => {
        if (event.kind === 'deployment.published')
            deployments += 1;
        if (event.kind === 'error.raised')
            incidents += 1;
        if (event.kind === 'config.changed')
            configChanges += 1;
        if (event.kind === 'recipe.completed') {
            recipesCompleted += 1;
            lastValueProof = event.metadata?.artifact;
            stalledReference = event.timestamp;
        }
        if (event.kind === 'integration.state' || event.kind === 'feature.used' || event.kind === 'nudge.acted') {
            stalledReference = event.timestamp;
        }
    });
    const stalledHours = stalledReference ? hoursSince(stalledReference, now) : 9999;
    return {
        deployments,
        incidents,
        configChanges,
        recipesCompleted,
        stalledOnboardingHours: stalledHours,
        lastValueProof
    };
}
