"use strict";
/**
 * Generator tests
 */
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const utils_js_1 = require("../src/generators/utils.js");
const network_js_1 = require("../src/generators/network.js");
const identity_js_1 = require("../src/generators/identity.js");
const endpoint_js_1 = require("../src/generators/endpoint.js");
const cloud_js_1 = require("../src/generators/cloud.js");
const campaign_js_1 = require("../src/generators/campaign.js");
(0, vitest_1.describe)('SeededRandom', () => {
    (0, vitest_1.it)('should produce reproducible results', () => {
        const rng1 = new utils_js_1.SeededRandom(42);
        const rng2 = new utils_js_1.SeededRandom(42);
        (0, vitest_1.expect)(rng1.next()).toBe(rng2.next());
        (0, vitest_1.expect)(rng1.int(0, 100)).toBe(rng2.int(0, 100));
    });
    (0, vitest_1.it)('should produce different results with different seeds', () => {
        const rng1 = new utils_js_1.SeededRandom(42);
        const rng2 = new utils_js_1.SeededRandom(43);
        (0, vitest_1.expect)(rng1.next()).not.toBe(rng2.next());
    });
});
(0, vitest_1.describe)('syntheticId', () => {
    (0, vitest_1.it)('should generate valid UUIDs', () => {
        const id = (0, utils_js_1.syntheticId)();
        (0, vitest_1.expect)(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    });
});
(0, vitest_1.describe)('syntheticIpv4', () => {
    (0, vitest_1.it)('should generate IPs in documentation ranges', () => {
        const rng = new utils_js_1.SeededRandom(42);
        const ip = (0, utils_js_1.syntheticIpv4)(rng);
        (0, vitest_1.expect)(ip).toMatch(/^(192\.0\.2|198\.51\.100|203\.0\.113)\.\d+$/);
    });
});
(0, vitest_1.describe)('syntheticHostname', () => {
    (0, vitest_1.it)('should generate valid hostnames', () => {
        const rng = new utils_js_1.SeededRandom(42);
        const hostname = (0, utils_js_1.syntheticHostname)(rng);
        (0, vitest_1.expect)(hostname).toMatch(/^[a-z]+-\d+\.[a-z]+\.example$/);
    });
});
(0, vitest_1.describe)('generateNetworkFlow', () => {
    (0, vitest_1.it)('should generate valid network flow events', () => {
        const flow = (0, network_js_1.generateNetworkFlow)();
        (0, vitest_1.expect)(flow.eventType).toBe('network.flow');
        (0, vitest_1.expect)(flow.isSynthetic).toBe(true);
        (0, vitest_1.expect)(flow.source).toBeDefined();
        (0, vitest_1.expect)(flow.destination).toBeDefined();
        (0, vitest_1.expect)(['tcp', 'udp']).toContain(flow.protocol);
    });
    (0, vitest_1.it)('should be reproducible with seed', () => {
        const rng1 = new utils_js_1.SeededRandom(42);
        const rng2 = new utils_js_1.SeededRandom(42);
        const flow1 = (0, network_js_1.generateNetworkFlow)({ rng: rng1 });
        const flow2 = (0, network_js_1.generateNetworkFlow)({ rng: rng2 });
        (0, vitest_1.expect)(flow1.source.ip).toBe(flow2.source.ip);
    });
});
(0, vitest_1.describe)('generateDnsEvent', () => {
    (0, vitest_1.it)('should generate valid DNS events', () => {
        const dns = (0, network_js_1.generateDnsEvent)();
        (0, vitest_1.expect)(dns.eventType).toBe('network.dns');
        (0, vitest_1.expect)(dns.isSynthetic).toBe(true);
        (0, vitest_1.expect)(dns.queryName).toBeDefined();
        (0, vitest_1.expect)(['A', 'AAAA', 'CNAME', 'MX']).toContain(dns.queryType);
    });
});
(0, vitest_1.describe)('generateNetworkBatch', () => {
    (0, vitest_1.it)('should generate the requested number of events', () => {
        const events = (0, network_js_1.generateNetworkBatch)(50);
        (0, vitest_1.expect)(events.length).toBe(50);
    });
    (0, vitest_1.it)('should generate mixed event types', () => {
        const events = (0, network_js_1.generateNetworkBatch)(100);
        const types = new Set(events.map((e) => e.eventType));
        (0, vitest_1.expect)(types.size).toBeGreaterThan(1);
    });
});
(0, vitest_1.describe)('generateAuthEvent', () => {
    (0, vitest_1.it)('should generate valid auth events', () => {
        const auth = (0, identity_js_1.generateAuthEvent)();
        (0, vitest_1.expect)(auth.eventType).toBe('identity.auth');
        (0, vitest_1.expect)(auth.isSynthetic).toBe(true);
        (0, vitest_1.expect)(auth.userId).toBeDefined();
        (0, vitest_1.expect)(auth.username).toBeDefined();
    });
});
(0, vitest_1.describe)('generateIdentityBatch', () => {
    (0, vitest_1.it)('should generate identity events', () => {
        const events = (0, identity_js_1.generateIdentityBatch)(20);
        (0, vitest_1.expect)(events.length).toBe(20);
        events.forEach((e) => {
            (0, vitest_1.expect)(e.eventType).toMatch(/^identity\./);
        });
    });
});
(0, vitest_1.describe)('generateProcessEvent', () => {
    (0, vitest_1.it)('should generate valid process events', () => {
        const proc = (0, endpoint_js_1.generateProcessEvent)();
        (0, vitest_1.expect)(proc.eventType).toBe('endpoint.process');
        (0, vitest_1.expect)(proc.isSynthetic).toBe(true);
        (0, vitest_1.expect)(proc.processName).toBeDefined();
        (0, vitest_1.expect)(proc.hostId).toBeDefined();
    });
});
(0, vitest_1.describe)('generateEndpointBatch', () => {
    (0, vitest_1.it)('should generate endpoint events', () => {
        const events = (0, endpoint_js_1.generateEndpointBatch)(20);
        (0, vitest_1.expect)(events.length).toBe(20);
        events.forEach((e) => {
            (0, vitest_1.expect)(e.eventType).toMatch(/^endpoint\./);
        });
    });
});
(0, vitest_1.describe)('generateIamEvent', () => {
    (0, vitest_1.it)('should generate valid IAM events', () => {
        const iam = (0, cloud_js_1.generateIamEvent)();
        (0, vitest_1.expect)(iam.eventType).toBe('cloud.iam');
        (0, vitest_1.expect)(iam.isSynthetic).toBe(true);
        (0, vitest_1.expect)(iam.provider).toBe('aws');
        (0, vitest_1.expect)(iam.accountId).toBeDefined();
    });
});
(0, vitest_1.describe)('generateCloudBatch', () => {
    (0, vitest_1.it)('should generate cloud events', () => {
        const events = (0, cloud_js_1.generateCloudBatch)(20);
        (0, vitest_1.expect)(events.length).toBe(20);
        events.forEach((e) => {
            (0, vitest_1.expect)(e.eventType).toMatch(/^cloud\./);
        });
    });
});
(0, vitest_1.describe)('generateCampaign', () => {
    (0, vitest_1.it)('should generate a valid campaign', () => {
        const campaign = (0, campaign_js_1.generateCampaign)(campaign_js_1.campaignTemplates[0]);
        (0, vitest_1.expect)(campaign.isSynthetic).toBe(true);
        (0, vitest_1.expect)(campaign.name).toBe(campaign_js_1.campaignTemplates[0].name);
        (0, vitest_1.expect)(campaign.steps.length).toBe(campaign_js_1.campaignTemplates[0].tactics.length);
    });
    (0, vitest_1.it)('should generate events for each step', () => {
        const campaign = (0, campaign_js_1.generateCampaign)(campaign_js_1.campaignTemplates[0]);
        campaign.steps.forEach((step) => {
            (0, vitest_1.expect)(step.events.length).toBeGreaterThan(0);
        });
    });
});
