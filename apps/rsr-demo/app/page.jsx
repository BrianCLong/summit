import {
  AllowAdapter,
  KAnonymityFilterAdapter,
  RetrievalSafetyRouter,
  SemanticPIIRedactorAdapter,
  TenantScopeLimiterAdapter,
} from '../../../packages/rsr/dist/index.js';

const scenarios = [
  {
    id: 'tenant-deny',
    title: 'Cross-tenant escalation attempt',
    description: 'Requests data for a tenant that is not authorized for this retriever.',
    context: {
      tenantId: 'tenant-x',
      query: 'Retrieve conversations tagged with ops-critical',
      selectors: ['tenant:executive'],
      selectorStats: {
        'tenant:executive': 42,
      },
    },
  },
  {
    id: 'k-anon',
    title: 'Selector too narrow',
    description: 'One selector is below the allowed k threshold and is pruned.',
    context: {
      tenantId: 'tenant-a',
      query: 'Summaries for region bravo and microsegment delta',
      selectors: ['region:bravo', 'microsegment:delta'],
      selectorStats: {
        'region:bravo': 30,
        'microsegment:delta': 2,
      },
    },
  },
  {
    id: 'pii',
    title: 'PII leakage',
    description: 'Contains an SSN that will be redacted by policy.',
    context: {
      tenantId: 'tenant-a',
      query: 'Cross-check ssn 123-45-6789 against fraud cases',
      selectors: ['risk:fraud'],
      selectorStats: {
        'risk:fraud': 12,
      },
    },
  },
  {
    id: 'allow',
    title: 'Policy compliant',
    description: 'Meets all policy controls and passes through.',
    context: {
      tenantId: 'tenant-a',
      query: 'Fetch sanitized incident overview for sector echo',
      selectors: ['sector:echo'],
      selectorStats: {
        'sector:echo': 18,
      },
    },
  },
];

const router = new RetrievalSafetyRouter(
  [
    new TenantScopeLimiterAdapter({ allowedTenants: ['tenant-a', 'tenant-b'] }),
    new KAnonymityFilterAdapter({ k: 3, fallbackSelector: 'tenant:all' }),
    new SemanticPIIRedactorAdapter(),
  ],
  new AllowAdapter(),
);

async function evaluateScenarios() {
  const results = [];
  for (const scenario of scenarios) {
    const decision = await router.route(scenario.context);
    results.push({ scenario, decision });
  }
  return results;
}

function DecisionBadge({ action }) {
  return <span className={`badge ${action}`}>{action.toUpperCase()}</span>;
}

function Details({ decision }) {
  if (decision.action === 'deny') {
    return <p>Request blocked. {decision.explanation}</p>;
  }
  if (decision.action === 'redact') {
    return (
      <div>
        <p>{decision.explanation}</p>
        <pre>{decision.redactedQuery}</pre>
      </div>
    );
  }
  if (decision.action === 'transform') {
    return (
      <div>
        <p>{decision.explanation}</p>
        <pre>{JSON.stringify(decision.sanitizedSelectors, null, 2)}</pre>
      </div>
    );
  }
  return <p>{decision.explanation}</p>;
}

export default async function Page() {
  const results = await evaluateScenarios();
  return (
    <main>
      <h1>Retrieval Safety Router</h1>
      <p>
        This demo shows how the Retrieval Safety Router evaluates pre-query governance rules and produces
        deterministic, explainable outcomes.
      </p>
      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Scenario</th>
              <th>Action</th>
              <th>Explanation</th>
            </tr>
          </thead>
          <tbody>
            {results.map(({ scenario, decision }) => (
              <tr key={scenario.id}>
                <td>
                  <strong>{scenario.title}</strong>
                  <p>{scenario.description}</p>
                </td>
                <td>
                  <DecisionBadge action={decision.action} />
                </td>
                <td>
                  <Details decision={decision} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <footer>
        Powered by policy-aware adapters: tenant scope limiter, k-anonymity filter, semantic PII redactor, and the
        default allow adapter.
      </footer>
    </main>
  );
}
