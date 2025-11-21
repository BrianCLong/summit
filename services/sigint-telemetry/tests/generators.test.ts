/**
 * Generator tests
 */

import { describe, it, expect } from 'vitest';
import {
  SeededRandom,
  syntheticId,
  syntheticIpv4,
  syntheticHostname,
} from '../src/generators/utils.js';
import {
  generateNetworkFlow,
  generateDnsEvent,
  generateNetworkBatch,
} from '../src/generators/network.js';
import {
  generateAuthEvent,
  generateIdentityBatch,
} from '../src/generators/identity.js';
import {
  generateProcessEvent,
  generateEndpointBatch,
} from '../src/generators/endpoint.js';
import {
  generateIamEvent,
  generateCloudBatch,
} from '../src/generators/cloud.js';
import {
  generateCampaign,
  campaignTemplates,
} from '../src/generators/campaign.js';

describe('SeededRandom', () => {
  it('should produce reproducible results', () => {
    const rng1 = new SeededRandom(42);
    const rng2 = new SeededRandom(42);

    expect(rng1.next()).toBe(rng2.next());
    expect(rng1.int(0, 100)).toBe(rng2.int(0, 100));
  });

  it('should produce different results with different seeds', () => {
    const rng1 = new SeededRandom(42);
    const rng2 = new SeededRandom(43);

    expect(rng1.next()).not.toBe(rng2.next());
  });
});

describe('syntheticId', () => {
  it('should generate valid UUIDs', () => {
    const id = syntheticId();
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  });
});

describe('syntheticIpv4', () => {
  it('should generate IPs in documentation ranges', () => {
    const rng = new SeededRandom(42);
    const ip = syntheticIpv4(rng);
    expect(ip).toMatch(/^(192\.0\.2|198\.51\.100|203\.0\.113)\.\d+$/);
  });
});

describe('syntheticHostname', () => {
  it('should generate valid hostnames', () => {
    const rng = new SeededRandom(42);
    const hostname = syntheticHostname(rng);
    expect(hostname).toMatch(/^[a-z]+-\d+\.[a-z]+\.example$/);
  });
});

describe('generateNetworkFlow', () => {
  it('should generate valid network flow events', () => {
    const flow = generateNetworkFlow();
    expect(flow.eventType).toBe('network.flow');
    expect(flow.isSynthetic).toBe(true);
    expect(flow.source).toBeDefined();
    expect(flow.destination).toBeDefined();
    expect(['tcp', 'udp']).toContain(flow.protocol);
  });

  it('should be reproducible with seed', () => {
    const rng1 = new SeededRandom(42);
    const rng2 = new SeededRandom(42);
    const flow1 = generateNetworkFlow({ rng: rng1 });
    const flow2 = generateNetworkFlow({ rng: rng2 });
    expect(flow1.source.ip).toBe(flow2.source.ip);
  });
});

describe('generateDnsEvent', () => {
  it('should generate valid DNS events', () => {
    const dns = generateDnsEvent();
    expect(dns.eventType).toBe('network.dns');
    expect(dns.isSynthetic).toBe(true);
    expect(dns.queryName).toBeDefined();
    expect(['A', 'AAAA', 'CNAME', 'MX']).toContain(dns.queryType);
  });
});

describe('generateNetworkBatch', () => {
  it('should generate the requested number of events', () => {
    const events = generateNetworkBatch(50);
    expect(events.length).toBe(50);
  });

  it('should generate mixed event types', () => {
    const events = generateNetworkBatch(100);
    const types = new Set(events.map((e) => e.eventType));
    expect(types.size).toBeGreaterThan(1);
  });
});

describe('generateAuthEvent', () => {
  it('should generate valid auth events', () => {
    const auth = generateAuthEvent();
    expect(auth.eventType).toBe('identity.auth');
    expect(auth.isSynthetic).toBe(true);
    expect(auth.userId).toBeDefined();
    expect(auth.username).toBeDefined();
  });
});

describe('generateIdentityBatch', () => {
  it('should generate identity events', () => {
    const events = generateIdentityBatch(20);
    expect(events.length).toBe(20);
    events.forEach((e) => {
      expect(e.eventType).toMatch(/^identity\./);
    });
  });
});

describe('generateProcessEvent', () => {
  it('should generate valid process events', () => {
    const proc = generateProcessEvent();
    expect(proc.eventType).toBe('endpoint.process');
    expect(proc.isSynthetic).toBe(true);
    expect(proc.processName).toBeDefined();
    expect(proc.hostId).toBeDefined();
  });
});

describe('generateEndpointBatch', () => {
  it('should generate endpoint events', () => {
    const events = generateEndpointBatch(20);
    expect(events.length).toBe(20);
    events.forEach((e) => {
      expect(e.eventType).toMatch(/^endpoint\./);
    });
  });
});

describe('generateIamEvent', () => {
  it('should generate valid IAM events', () => {
    const iam = generateIamEvent();
    expect(iam.eventType).toBe('cloud.iam');
    expect(iam.isSynthetic).toBe(true);
    expect(iam.provider).toBe('aws');
    expect(iam.accountId).toBeDefined();
  });
});

describe('generateCloudBatch', () => {
  it('should generate cloud events', () => {
    const events = generateCloudBatch(20);
    expect(events.length).toBe(20);
    events.forEach((e) => {
      expect(e.eventType).toMatch(/^cloud\./);
    });
  });
});

describe('generateCampaign', () => {
  it('should generate a valid campaign', () => {
    const campaign = generateCampaign(campaignTemplates[0]);
    expect(campaign.isSynthetic).toBe(true);
    expect(campaign.name).toBe(campaignTemplates[0].name);
    expect(campaign.steps.length).toBe(campaignTemplates[0].tactics.length);
  });

  it('should generate events for each step', () => {
    const campaign = generateCampaign(campaignTemplates[0]);
    campaign.steps.forEach((step) => {
      expect(step.events.length).toBeGreaterThan(0);
    });
  });
});
