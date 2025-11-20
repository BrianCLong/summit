import React, { useEffect, useMemo, useRef, useState } from 'react';
import { estimatePromptCost } from '../utils/costEstimator';
import { useI18n } from '../hooks/useI18n';

type CopilotResponse = {
  ok?: boolean;
  type?: 'nl2cypher' | 'rag';
  preview?: string;
  plan?: any;
  costEstimate?: any;
  answer?: string;
  citations?: { source: string; title: string; score: number }[];
  guardrail?: { deny: boolean; reason: string };
};

const url =
  (import.meta as any).env?.VITE_COPILOT_URL ||
  'http://localhost:4100/copilot/query';

export default function CopilotPanel() {
  const { t } = useI18n();
  const [prompt, setPrompt] = useState('shortest path from person P1 to H1');
  const [mode, setMode] = useState<'auto' | 'nl2cypher' | 'ask'>('auto');
  const [loading, setLoading] = useState(false);
  const [resp, setResp] = useState<CopilotResponse | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const localCost = useMemo(() => estimatePromptCost(prompt), [prompt]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handler);
    const openHandler = () => {
      inputRef.current?.focus();
      inputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };
    const runHandler = (ev: Event) => {
      const detail = (ev as CustomEvent).detail || {};
      if (detail.mode) setMode(detail.mode);
      setTimeout(run, 0);
    };
    window.addEventListener('open-copilot', openHandler as any);
    window.addEventListener('copilot:run', runHandler as any);
    return () => {
      window.removeEventListener('keydown', handler);
      window.removeEventListener('open-copilot', openHandler as any);
      window.removeEventListener('copilot:run', runHandler as any);
    };
  }, []);

  async function run() {
    setLoading(true);
    setResp(null);
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ prompt, mode }),
      });
      const data = await res.json();
      setResp(data);
    } catch (e) {
      setResp({ ok: false, answer: String(e) });
    } finally {
      setLoading(false);
    }
  }

  async function checkSafety() {
    try {
      const api =
        (import.meta as any).env?.VITE_API_URL || 'http://localhost:4000';
      const res = await fetch(api + '/copilot/classify', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });
      const data = await res.json();
      setResp({
        ...(resp || {}),
        type: 'safety',
        answer: `Classification: ${data.classification} (${(data.reasons || []).join(',')})`,
      } as any);
    } catch (e) {
      /* noop */
    }
  }

  async function loadCookbook() {
    try {
      const api =
        (import.meta as any).env?.VITE_API_URL || 'http://localhost:4000';
      const res = await fetch(api + '/copilot/cookbook', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ topic: 'analytics' }),
      });
      const data = await res.json();
      setResp({
        ...(resp || {}),
        type: 'cookbook',
        citations: (data.items || []).map((x: any) => ({
          source: x.id,
          title: x.title,
          score: 1,
        })),
      } as any);
    } catch (e) {
      /* noop */
    }
  }

  return (
    <div
      role="region"
      aria-label={t('copilot.title')}
      style={{ border: '1px solid #ddd', borderRadius: 6, padding: 12 }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 8,
        }}
      >
        <strong>{t('copilot.title')}</strong>
        <small>{t('copilot.shortcuts')}</small>
      </div>
      <textarea
        ref={inputRef}
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        rows={4}
        aria-label="Copilot Prompt"
        style={{ width: '100%', fontFamily: 'monospace', marginBottom: 8 }}
      />
      <div
        style={{
          display: 'flex',
          gap: 8,
          alignItems: 'center',
          marginBottom: 8,
        }}
      >
        <select
          value={mode}
          onChange={(e) => setMode(e.target.value as any)}
          aria-label="Copilot Mode"
        >
          <option value="auto">{t('copilot.mode.auto')}</option>
          <option value="nl2cypher">{t('copilot.mode.nl2cypher')}</option>
          <option value="ask">{t('copilot.mode.ask')}</option>
        </select>
        <button onClick={run} disabled={loading}>
          {loading ? t('copilot.running') : t('copilot.run')}
        </button>
        <button onClick={checkSafety} disabled={loading}>
          {t('copilot.checkSafety')}
        </button>
        <button onClick={loadCookbook} disabled={loading}>
          {t('copilot.cookbook')}
        </button>
        <div style={{ marginLeft: 'auto', fontSize: 12, color: '#666' }}>
          {t('copilot.estCost')} {localCost.score}
        </div>
      </div>
      {resp?.guardrail?.deny && (
        <div role="alert" style={{ color: '#a00', marginBottom: 8 }}>
          {t('copilot.blocked')} {resp.guardrail.reason}
        </div>
      )}
      {resp?.type === 'nl2cypher' && (
        <div>
          <div style={{ fontSize: 12, color: '#666' }}>{t('copilot.preview')}</div>
          <pre
            style={{
              background: '#f8f8f8',
              padding: 8,
              borderRadius: 4,
              overflowX: 'auto',
            }}
          >
            {resp.preview}
          </pre>
          {resp.costEstimate && (
            <div style={{ fontSize: 12, color: '#666' }}>
              {t('copilot.cost')} {JSON.stringify(resp.costEstimate)}
            </div>
          )}
        </div>
      )}
      {resp?.type === 'rag' && (
        <div>
          <div style={{ fontSize: 12, color: '#666' }}>{t('copilot.answer')}</div>
          <div style={{ whiteSpace: 'pre-wrap', marginBottom: 8 }}>
            {resp.answer}
          </div>
          <div style={{ fontSize: 12, color: '#666' }}>{t('copilot.citations')}</div>
          <ul>
            {(resp.citations || []).map((c, i) => (
              <li key={i}>
                {c.title} <small>({c.score})</small> – <code>{c.source}</code>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
