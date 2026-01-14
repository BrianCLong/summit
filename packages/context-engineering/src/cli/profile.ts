import { buildContext } from '../context-engineer.js';
import type { ContextBuildInput } from '../types.js';

const sample: ContextBuildInput = {
  system: [
    {
      stream: 'system',
      content: 'You are Maestro. Follow governance policies.',
      source: 'system',
      provenance: 'cli',
      policyLabels: ['policy'],
      priority: 'critical',
    },
  ],
  user: [
    {
      stream: 'user',
      content: 'Summarize the decision log and keep commitments intact.',
      source: 'cli',
      provenance: 'cli',
      policyLabels: ['intent'],
      priority: 'high',
    },
  ],
  history: [
    {
      stream: 'history',
      content: 'Agent committed to deliver an audit-ready report.',
      source: 'history',
      provenance: 'cli',
      policyLabels: ['commitment'],
      priority: 'high',
    },
    {
      stream: 'history',
      content:
        'Reasoning trace: gathered sources, deduplicated citations, and aligned policies.',
      source: 'history',
      provenance: 'cli',
      policyLabels: ['reasoning'],
      priority: 'medium',
    },
  ],
  toolOutputs: [
    {
      stream: 'toolOutputs',
      content:
        'Large tool output payload '.repeat(80),
      source: 'tool',
      provenance: 'cli',
      priority: 'low',
    },
  ],
};

const result = buildContext(sample);

console.log('Context utilization:', result.metrics.context_utilization.toFixed(2));
console.log('Eviction frequency:', result.metrics.eviction_frequency.toFixed(2));
console.log('Token sinks:', result.metrics.token_sinks);
console.log('Manifest evictions:', result.manifest.evictions.length);
