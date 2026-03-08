"use strict";
/**
 * Coordinated Inauthentic Behavior (CIB) Detection
 * Identifies coordinated campaigns and inauthentic activity patterns
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CIBDetector = void 0;
class CIBDetector {
    async detectCIB(behaviors) {
        const campaigns = [];
        // Detect temporal coordination
        const temporalCampaigns = this.detectTemporalCoordination(behaviors);
        campaigns.push(...temporalCampaigns);
        // Detect content coordination
        const contentCampaigns = this.detectContentCoordination(behaviors);
        campaigns.push(...contentCampaigns);
        // Detect network coordination
        const networkCampaigns = this.detectNetworkCoordination(behaviors);
        campaigns.push(...networkCampaigns);
        // Merge overlapping campaigns
        return this.mergeCampaigns(campaigns);
    }
    detectTemporalCoordination(behaviors) {
        const campaigns = [];
        const timeWindows = this.createTimeWindows(behaviors);
        for (const window of timeWindows) {
            const coordinatedAccounts = this.findTemporallyCoordinated(behaviors, window.start, window.end);
            if (coordinatedAccounts.length >= 3) {
                const indicators = [
                    {
                        type: 'temporal_coordination',
                        description: `${coordinatedAccounts.length} accounts posting within narrow time window`,
                        affectedAccounts: coordinatedAccounts,
                        score: 0.4,
                    },
                ];
                campaigns.push({
                    campaignId: this.generateCampaignId('temporal', window.start),
                    accounts: coordinatedAccounts,
                    coordinationScore: this.calculateCoordinationScore(coordinatedAccounts.length),
                    inauthenticityScore: 0.5,
                    confidence: 0.6,
                    indicators,
                    timeframe: window,
                });
            }
        }
        return campaigns;
    }
    detectContentCoordination(behaviors) {
        const campaigns = [];
        const contentGroups = this.groupBySimilarContent(behaviors);
        for (const group of contentGroups) {
            if (group.accounts.length >= 3) {
                const indicators = [
                    {
                        type: 'content_coordination',
                        description: `${group.accounts.length} accounts posting similar content`,
                        affectedAccounts: group.accounts,
                        score: 0.5,
                    },
                ];
                campaigns.push({
                    campaignId: this.generateCampaignId('content', new Date()),
                    accounts: group.accounts,
                    coordinationScore: this.calculateCoordinationScore(group.accounts.length),
                    inauthenticityScore: group.similarity,
                    confidence: 0.7,
                    indicators,
                    timeframe: group.timeframe,
                });
            }
        }
        return campaigns;
    }
    detectNetworkCoordination(behaviors) {
        const campaigns = [];
        // Build connection graph
        const graph = this.buildConnectionGraph(behaviors);
        // Find dense clusters (potential coordinated networks)
        const clusters = this.findDenseClusters(graph);
        for (const cluster of clusters) {
            if (cluster.length >= 3) {
                const indicators = [
                    {
                        type: 'network_coordination',
                        description: `Dense network of ${cluster.length} interconnected accounts`,
                        affectedAccounts: cluster,
                        score: 0.4,
                    },
                ];
                campaigns.push({
                    campaignId: this.generateCampaignId('network', new Date()),
                    accounts: cluster,
                    coordinationScore: this.calculateNetworkCoordination(cluster, graph),
                    inauthenticityScore: 0.6,
                    confidence: 0.65,
                    indicators,
                    timeframe: { start: new Date(), end: new Date() },
                });
            }
        }
        return campaigns;
    }
    createTimeWindows(behaviors) {
        const allTimestamps = [];
        for (const behavior of behaviors) {
            for (const activity of behavior.activities) {
                allTimestamps.push(activity.timestamp);
            }
        }
        allTimestamps.sort((a, b) => a.getTime() - b.getTime());
        const windows = [];
        const windowSize = 60 * 60 * 1000; // 1 hour
        for (let i = 0; i < allTimestamps.length; i++) {
            const start = allTimestamps[i];
            const end = new Date(start.getTime() + windowSize);
            windows.push({ start, end });
        }
        return windows;
    }
    findTemporallyCoordinated(behaviors, start, end) {
        const coordinatedAccounts = new Set();
        const timeThreshold = 5 * 60 * 1000; // 5 minutes
        for (const behavior of behaviors) {
            const activitiesInWindow = behavior.activities.filter(activity => activity.timestamp >= start &&
                activity.timestamp <= end);
            if (activitiesInWindow.length > 0) {
                coordinatedAccounts.add(behavior.accountId);
            }
        }
        return Array.from(coordinatedAccounts);
    }
    groupBySimilarContent(behaviors) {
        const groups = [];
        const contentMap = new Map();
        for (const behavior of behaviors) {
            for (const activity of behavior.activities) {
                if (activity.content) {
                    const normalized = this.normalizeContent(activity.content);
                    if (!contentMap.has(normalized)) {
                        contentMap.set(normalized, []);
                    }
                    contentMap.get(normalized).push(behavior.accountId);
                }
            }
        }
        for (const [content, accounts] of contentMap.entries()) {
            if (accounts.length >= 3) {
                groups.push({
                    accounts: [...new Set(accounts)],
                    similarity: 0.9,
                    timeframe: { start: new Date(), end: new Date() },
                });
            }
        }
        return groups;
    }
    buildConnectionGraph(behaviors) {
        const graph = new Map();
        for (const behavior of behaviors) {
            if (!graph.has(behavior.accountId)) {
                graph.set(behavior.accountId, new Set());
            }
            for (const connection of behavior.connections) {
                graph.get(behavior.accountId).add(connection);
            }
        }
        return graph;
    }
    findDenseClusters(graph) {
        const clusters = [];
        const visited = new Set();
        for (const [accountId, connections] of graph.entries()) {
            if (visited.has(accountId))
                continue;
            // Find densely connected subgraph
            const cluster = this.expandCluster(accountId, graph, visited);
            if (cluster.length >= 3) {
                clusters.push(cluster);
            }
        }
        return clusters;
    }
    expandCluster(startId, graph, visited) {
        const cluster = [startId];
        visited.add(startId);
        const connections = graph.get(startId) || new Set();
        for (const connectedId of connections) {
            if (!visited.has(connectedId)) {
                const connectedConnections = graph.get(connectedId) || new Set();
                // Check if densely connected to cluster
                let connectionCount = 0;
                for (const clusterId of cluster) {
                    if (connectedConnections.has(clusterId)) {
                        connectionCount++;
                    }
                }
                // If connected to > 50% of cluster, add to cluster
                if (connectionCount / cluster.length > 0.5) {
                    cluster.push(connectedId);
                    visited.add(connectedId);
                }
            }
        }
        return cluster;
    }
    calculateCoordinationScore(accountCount) {
        // More accounts = higher coordination score
        return Math.min(accountCount / 10, 1);
    }
    calculateNetworkCoordination(accounts, graph) {
        let totalConnections = 0;
        const maxPossibleConnections = (accounts.length * (accounts.length - 1)) / 2;
        for (const account of accounts) {
            const connections = graph.get(account) || new Set();
            for (const other of accounts) {
                if (account !== other && connections.has(other)) {
                    totalConnections++;
                }
            }
        }
        return totalConnections / (maxPossibleConnections * 2); // Divide by 2 for bidirectional
    }
    normalizeContent(content) {
        return content.toLowerCase().replace(/\s+/g, ' ').trim();
    }
    generateCampaignId(type, timestamp) {
        return `cib_${type}_${timestamp.getTime()}`;
    }
    mergeCampaigns(campaigns) {
        // Simple merge - in production, use more sophisticated clustering
        const merged = new Map();
        for (const campaign of campaigns) {
            const key = campaign.accounts.sort().join('_');
            if (!merged.has(key)) {
                merged.set(key, campaign);
            }
            else {
                const existing = merged.get(key);
                existing.indicators.push(...campaign.indicators);
                existing.coordinationScore = Math.max(existing.coordinationScore, campaign.coordinationScore);
                existing.inauthenticityScore = Math.max(existing.inauthenticityScore, campaign.inauthenticityScore);
            }
        }
        return Array.from(merged.values());
    }
}
exports.CIBDetector = CIBDetector;
