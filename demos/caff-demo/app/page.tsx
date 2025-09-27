'use client';

import { useMemo, useState, type CSSProperties } from 'react';
import type { EvaluateResponse, Policy, SubjectContext } from '@caff/sdk';
import { CaffClient } from '@caff/sdk';

type DryDiff = {
  flagKey: string;
  decisionChange?: { before: EvaluateResponse; after: EvaluateResponse };
  changedFields: string[];
};

const FLAG_KEY = 'purposeful-beta';

const basePolicy: Policy = {
  flags: {
    [FLAG_KEY]: {
      key: FLAG_KEY,
      description: 'Beta-only experience gated by analytics consent.',
      purposes: ['analytics'],
      jurisdictions: ['US', 'CA'],
      audiences: ['beta'],
      expiresAt: farFuture(),
      rollout: { percentage: 50 },
    },
    'ads-personalization': {
      key: 'ads-personalization',
      description: 'Ads personalization requires explicit consent and EU residency.',
      purposes: ['ads'],
      jurisdictions: ['EU'],
      audiences: ['ads'],
      expiresAt: farFuture(),
      rollout: { percentage: 100 },
    },
  },
};

const newPolicy: Policy = {
  flags: {
    [FLAG_KEY]: {
      ...basePolicy.flags[FLAG_KEY],
      purposes: ['analytics', 'personalization'],
      rollout: { percentage: 25 },
    },
    'ads-personalization': {
      ...basePolicy.flags['ads-personalization'],
      expiresAt: soonExpiry(),
    },
  },
};

export default function Page() {
  const client = useMemo(() => new CaffClient('http://localhost:8080'), []);
  const [subjectId, setSubjectId] = useState('demo-user');
  const [jurisdiction, setJurisdiction] = useState('US');
  const [audiences, setAudiences] = useState('beta');
  const [bucketId, setBucketId] = useState('demo-user');
  const [consentInput, setConsentInput] = useState('analytics=granted');
  const [localResult, setLocalResult] = useState<EvaluateResponse | null>(null);
  const [remoteResult, setRemoteResult] = useState<EvaluateResponse | null>(null);
  const [diff, setDiff] = useState<DryDiff[]>([]);
  const [error, setError] = useState<string | null>(null);

  const buildContext = (): SubjectContext => ({
    subjectId: subjectId.trim() || 'demo-user',
    bucketId: bucketId.trim() || undefined,
    jurisdiction: jurisdiction.trim() || undefined,
    audiences: audiences
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean),
    consents: parseConsent(consentInput),
    evaluatedAt: new Date().toISOString(),
  });

  const handleEvaluateLocal = () => {
    try {
      const context = buildContext();
      const flag = basePolicy.flags[FLAG_KEY];
      const result = client.evaluateLocal(flag, context);
      setLocalResult(result);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleEvaluateRemote = async () => {
    try {
      const context = buildContext();
      const result = await client.isEnabled(FLAG_KEY, context);
      setRemoteResult(result);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleDryRun = () => {
    const context = buildContext();
    const flag = basePolicy.flags[FLAG_KEY];
    const newFlag = newPolicy.flags[FLAG_KEY];
    const before = client.evaluateLocal(flag, context);
    const after = client.evaluateLocal(newFlag, context);

    const dryDiff: DryDiff[] = [
      {
        flagKey: FLAG_KEY,
        decisionChange:
          before.decision === after.decision && JSON.stringify(before.explainPath) === JSON.stringify(after.explainPath)
            ? undefined
            : { before, after },
        changedFields: diffFields(basePolicy.flags[FLAG_KEY], newPolicy.flags[FLAG_KEY]),
      },
      {
        flagKey: 'ads-personalization',
        decisionChange: undefined,
        changedFields: diffFields(basePolicy.flags['ads-personalization'], newPolicy.flags['ads-personalization']),
      },
    ];

    setDiff(dryDiff);
  };

  return (
    <main style={styles.main}>
      <section style={styles.hero}>
        <h1>Consent-Aware Feature Flags</h1>
        <p>
          Purpose-scoped toggles stay deterministic. Provide a context, evaluate locally via the SDK, call the Go service, and
          preview dry-run diffs.
        </p>
      </section>

      <section style={styles.panel}>
        <h2>Subject context</h2>
        <div style={styles.formGrid}>
          <label style={styles.label}>
            Subject ID
            <input style={styles.input} value={subjectId} onChange={(event) => setSubjectId(event.target.value)} />
          </label>
          <label style={styles.label}>
            Bucket ID
            <input style={styles.input} value={bucketId} onChange={(event) => setBucketId(event.target.value)} />
          </label>
          <label style={styles.label}>
            Jurisdiction
            <input style={styles.input} value={jurisdiction} onChange={(event) => setJurisdiction(event.target.value)} />
          </label>
          <label style={styles.label}>
            Audiences (comma separated)
            <input style={styles.input} value={audiences} onChange={(event) => setAudiences(event.target.value)} />
          </label>
        </div>
        <label style={styles.label}>
          Consents (purpose=value)
          <input style={styles.input} value={consentInput} onChange={(event) => setConsentInput(event.target.value)} />
        </label>
        <div style={styles.buttonRow}>
          <button style={styles.button} onClick={handleEvaluateLocal}>
            Evaluate with SDK
          </button>
          <button style={styles.button} onClick={handleEvaluateRemote}>
            Call Go service
          </button>
          <button style={styles.secondaryButton} onClick={handleDryRun}>
            Dry-run diff
          </button>
        </div>
        {error ? <p style={styles.error}>⚠️ {error}</p> : null}
      </section>

      <section style={styles.resultRow}>
        <ResultCard title="SDK decision" result={localResult} />
        <ResultCard title="Service decision" result={remoteResult} />
      </section>

      <section style={styles.panel}>
        <h2>Dry-run preview</h2>
        {diff.length === 0 ? (
          <p style={{ opacity: 0.7 }}>Run a dry-run to see how policy updates flip impacted flags.</p>
        ) : (
          <ul style={styles.diffList}>
            {diff.map((item) => (
              <li key={item.flagKey} style={styles.diffItem}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <strong>{item.flagKey}</strong>
                  <span style={{ fontSize: '0.85rem', opacity: 0.7 }}>
                    {item.changedFields.length > 0 ? item.changedFields.join(', ') : 'no policy changes'}
                  </span>
                </div>
                {item.decisionChange ? (
                  <div style={styles.decisionChange}>
                    <span>
                      {item.decisionChange.before.decision} → {item.decisionChange.after.decision}
                    </span>
                    <details>
                      <summary>Explain diff</summary>
                      <pre style={styles.pre}>{JSON.stringify(item.decisionChange, null, 2)}</pre>
                    </details>
                  </div>
                ) : (
                  <p style={{ fontSize: '0.85rem', opacity: 0.7 }}>No decision change for provided context.</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

function ResultCard({ title, result }: { title: string; result: EvaluateResponse | null }) {
  return (
    <article style={styles.card}>
      <h3>{title}</h3>
      {result ? (
        <>
          <span style={styles.badge}>{result.decision}</span>
          <pre style={styles.pre}>{JSON.stringify(result.explainPath, null, 2)}</pre>
        </>
      ) : (
        <p style={{ opacity: 0.7 }}>No evaluation yet.</p>
      )}
    </article>
  );
}

function parseConsent(input: string): Record<string, string> {
  return input
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .reduce<Record<string, string>>((memo, entry) => {
      const [purpose, value] = entry.split('=').map((part) => part.trim());
      if (purpose) {
        memo[purpose] = value ?? '';
      }
      return memo;
    }, {});
}

function diffFields(baseFlag: Policy['flags'][string], nextFlag: Policy['flags'][string]): string[] {
  const changed: string[] = [];
  if (!sameSet(baseFlag.purposes, nextFlag.purposes)) {
    changed.push('purposes');
  }
  if (!sameSet(baseFlag.jurisdictions, nextFlag.jurisdictions)) {
    changed.push('jurisdictions');
  }
  if (!sameSet(baseFlag.audiences, nextFlag.audiences)) {
    changed.push('audiences');
  }
  if (baseFlag.expiresAt !== nextFlag.expiresAt) {
    changed.push('expiresAt');
  }
  if ((baseFlag.rollout?.percentage ?? 100) !== (nextFlag.rollout?.percentage ?? 100)) {
    changed.push('rollout.percentage');
  }
  return changed;
}

function sameSet(a?: string[], b?: string[]): boolean {
  const first = [...(a ?? [])].sort();
  const second = [...(b ?? [])].sort();
  return first.length === second.length && first.every((value, index) => value === second[index]);
}

function farFuture(): string {
  return new Date('2099-12-31T23:59:59Z').toISOString();
}

function soonExpiry(): string {
  const now = new Date();
  now.setMonth(now.getMonth() + 1);
  return now.toISOString();
}

const styles: Record<string, CSSProperties> = {
  main: {
    margin: '0 auto',
    maxWidth: '960px',
    padding: '3rem 1.5rem 4rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '2rem',
  },
  hero: {
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },
  panel: {
    background: 'rgba(15, 30, 70, 0.65)',
    borderRadius: '18px',
    padding: '1.5rem',
    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.4)',
    backdropFilter: 'blur(18px)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '1rem',
    marginBottom: '1rem',
  },
  label: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.4rem',
    fontSize: '0.9rem',
    opacity: 0.9,
  },
  input: {
    padding: '0.55rem 0.75rem',
    borderRadius: '12px',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    background: 'rgba(3, 10, 28, 0.6)',
    color: '#f4f7ff',
  },
  buttonRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.75rem',
    marginTop: '1rem',
  },
  button: {
    padding: '0.65rem 1.1rem',
    borderRadius: '999px',
    border: 'none',
    background: 'linear-gradient(135deg, #4cc0ff, #9c6bff)',
    color: '#04060f',
    fontWeight: 600,
  },
  secondaryButton: {
    padding: '0.65rem 1.1rem',
    borderRadius: '999px',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    background: 'transparent',
    color: '#f4f7ff',
    fontWeight: 600,
  },
  error: {
    marginTop: '0.75rem',
    color: '#ffb4b4',
  },
  resultRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
    gap: '1.5rem',
  },
  card: {
    background: 'rgba(10, 20, 50, 0.6)',
    borderRadius: '18px',
    padding: '1.5rem',
    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.4)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  badge: {
    alignSelf: 'flex-start',
    padding: '0.35rem 0.85rem',
    borderRadius: '999px',
    background: 'rgba(76, 192, 255, 0.18)',
    color: '#8ce0ff',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    fontSize: '0.75rem',
    fontWeight: 700,
  },
  pre: {
    margin: 0,
    background: 'rgba(3, 10, 28, 0.6)',
    borderRadius: '12px',
    padding: '0.75rem',
    fontSize: '0.8rem',
    overflowX: 'auto',
  },
  diffList: {
    listStyle: 'none',
    margin: 0,
    padding: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  diffItem: {
    background: 'rgba(8, 18, 40, 0.7)',
    borderRadius: '14px',
    padding: '1rem',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  decisionChange: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.4rem',
  },
};
