"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GitOpsSyncValidator = void 0;
class GitOpsSyncValidator {
    config;
    gitProvider;
    clusterProvider;
    constructor(config, gitProvider, clusterProvider) {
        this.config = config;
        this.gitProvider = gitProvider;
        this.clusterProvider = clusterProvider;
    }
    async validate() {
        console.log(`Starting GitOps sync validation for ${this.config.repoUrl} -> ${this.config.clusterNamespace}`);
        // Fetch states
        const gitState = await this.getGitState();
        const clusterState = await this.getClusterState();
        // Compare
        const report = this.compareStates(gitState, clusterState);
        this.logReport(report);
        return report;
    }
    async getGitState() {
        return this.gitProvider.fetchManifests(this.config.repoUrl, this.config.branch, this.config.manifestPath);
    }
    async getClusterState() {
        return this.clusterProvider.fetchResources(this.config.clusterNamespace, this.config.labelSelector);
    }
    compareStates(gitResources, clusterResources) {
        const drifts = [];
        const gitMap = new Map();
        gitResources.forEach(r => gitMap.set(this.getResourceId(r), r));
        const clusterMap = new Map();
        clusterResources.forEach(r => clusterMap.set(this.getResourceId(r), r));
        // Check for resources in Git that are missing or different in Cluster
        for (const [id, gitRes] of gitMap) {
            const clusterRes = clusterMap.get(id);
            if (!clusterRes) {
                drifts.push({
                    resourceId: id,
                    driftType: 'MISSING_IN_CLUSTER',
                    expected: 'Present',
                    actual: 'Missing'
                });
            }
            else {
                // Compare version
                if (gitRes.version !== clusterRes.version) {
                    drifts.push({
                        resourceId: id,
                        driftType: 'VERSION_MISMATCH',
                        expected: gitRes.version,
                        actual: clusterRes.version
                    });
                }
                // Compare replicas if applicable
                if (gitRes.replicas !== undefined && clusterRes.replicas !== undefined && gitRes.replicas !== clusterRes.replicas) {
                    drifts.push({
                        resourceId: id,
                        driftType: 'REPLICA_MISMATCH',
                        expected: gitRes.replicas,
                        actual: clusterRes.replicas
                    });
                }
            }
        }
        // Check for resources in Cluster that are not in Git (orphan resources)
        for (const [id, _] of clusterMap) {
            if (!gitMap.has(id)) {
                drifts.push({
                    resourceId: id,
                    driftType: 'MISSING_IN_GIT',
                    expected: 'Absent',
                    actual: 'Present'
                });
            }
        }
        return {
            hasDrift: drifts.length > 0,
            drifts,
            timestamp: new Date()
        };
    }
    getResourceId(resource) {
        return `${resource.kind}/${resource.name}`;
    }
    logReport(report) {
        if (!report.hasDrift) {
            console.log('✅ No drift detected. Cluster is in sync with Git.');
        }
        else {
            console.warn('⚠️  Drift detected!');
            report.drifts.forEach(drift => {
                console.warn(` - [${drift.driftType}] ${drift.resourceId}: Expected ${drift.expected}, found ${drift.actual}`);
            });
        }
    }
}
exports.GitOpsSyncValidator = GitOpsSyncValidator;
