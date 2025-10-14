import { EntityResolutionService } from "../services/EntityResolutionService.js";
export async function runBehavioralFingerprintJob(identities) {
    const er = new EntityResolutionService();
    const fingerprints = identities.map((i) => {
        const { fingerprint, score } = er.fuseBehavioralFingerprint(i.telemetry);
        return { id: i.id, projectId: i.projectId, fingerprint, score };
    });
    const clusters = er.clusterIdentitiesAcrossProjects(identities);
    return { fingerprints, clusters };
}
//# sourceMappingURL=behavioralFingerprintWorker.js.map