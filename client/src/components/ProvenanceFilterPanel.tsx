import React, { useMemo, useState } from 'react';
import { gql, useMutation } from '@apollo/client';

type Props = {
  onApply: (filter: {
    reasonCodeIn?: string[];
    kindIn?: string[];
    sourceIn?: string[];
    from?: string;
    to?: string;
    contains?: string;
  }) => void;
  initial?: {
    reasonCodeIn?: string[];
    kindIn?: string[];
    sourceIn?: string[];
    from?: string;
    to?: string;
    contains?: string;
  };
  scope?: 'incident' | 'investigation';
  id?: string;
};

const KNOWN_CODES = [
  'DUAL_CONTROL_DENIED',
  'INCIDENT_CLOSED_CANCELLED',
  'ATTESTATION_MISSING',
  'SBOM_POLICY_FAIL',
  'POLICY_DENY',
];

const KNOWN_KINDS = [
  'prompt',
  'retrieval',
  'policy',
  'inference',
  'action',
  'action_start',
  'action_complete',
];
const KNOWN_SOURCES = ['graphrag', 'soar', 'connector', 'system'];

export default function ProvenanceFilterPanel({
  onApply,
  initial,
  scope,
  id,
}: Props) {
  const [codes, setCodes] = useState<string[]>(initial?.reasonCodeIn || []);
  const [from, setFrom] = useState<string>(initial?.from || '');
  const [to, setTo] = useState<string>(initial?.to || '');
  const [kinds, setKinds] = useState<string[]>(initial?.kindIn || ([] as any));
  const [sources, setSources] = useState<string[]>(
    initial?.sourceIn || ([] as any),
  );
  const [contains, setContains] = useState<string>(initial?.contains || '');
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [exporting, setExporting] = useState<'csv' | 'json' | null>(null);

  const EXPORT_MUT = useMemo(
    () => gql`
      mutation ExportProv(
        $incidentId: ID
        $investigationId: ID
        $filter: ProvenanceFilter
        $format: String!
      ) {
        exportProvenance(
          incidentId: $incidentId
          investigationId: $investigationId
          filter: $filter
          format: $format
        ) {
          url
          expiresAt
        }
      }
    `,
    [],
  );
  const [exportProv] = useMutation(EXPORT_MUT);

  const buildCurl = (scope?: 'incident' | 'investigation', id?: string) => {
    if (!scope || !id) return '';
    const opName =
      scope === 'incident' ? 'ProvByIncident' : 'ProvByInvestigation';
    const field =
      scope === 'incident'
        ? 'provenanceByIncident'
        : 'provenanceByInvestigation';
    const query = `query ${opName}($id: ID!, $filter: ProvenanceFilter, $first: Int, $offset: Int) { ${field}(${scope}Id: $id, filter: $filter, first: $first, offset: $offset) { id kind createdAt metadata } }`;
    const filter: any = {};
    if (codes.length) filter.reasonCodeIn = codes;
    if (kinds.length) filter.kindIn = kinds;
    if (sources.length) filter.sourceIn = sources;
    if (from) filter.from = from;
    if (to) filter.to = to;
    if (contains && contains.trim().length) filter.contains = contains.trim();
    const body = { query, variables: { id, filter, first: 50, offset: 0 } };
    const payload = JSON.stringify(body);
    const endpoint = '/graphql';
    return `curl -sS -X POST '${endpoint}' -H 'Content-Type: application/json' --data-binary '${payload.replace(/'/g, "'\\''")}'`;
  };
  return (
    <div className="rounded border p-3">
      <div className="font-semibold mb-2">Filter Timeline</div>
      <div className="flex gap-3 items-center flex-wrap">
        <label>
          Reason Codes:
          <select
            multiple
            value={codes}
            onChange={(e) =>
              setCodes(Array.from(e.target.selectedOptions).map((o) => o.value))
            }
            className="ml-2 border p-1"
          >
            {KNOWN_CODES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label>
          Kind:
          <select
            multiple
            value={kinds}
            onChange={(e) =>
              setKinds(Array.from(e.target.selectedOptions).map((o) => o.value))
            }
            className="ml-2 border p-1"
          >
            {KNOWN_KINDS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label>
          Source:
          <select
            multiple
            value={sources}
            onChange={(e) =>
              setSources(
                Array.from(e.target.selectedOptions).map((o) => o.value),
              )
            }
            className="ml-2 border p-1"
          >
            {KNOWN_SOURCES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label>
          Contains:
          <input
            type="text"
            placeholder="free-text"
            value={contains}
            onChange={(e) => setContains(e.target.value)}
            className="ml-2 border p-1"
          />
        </label>
        <label>
          From:
          <input
            type="datetime-local"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="ml-2 border p-1"
          />
        </label>
        <label>
          To:
          <input
            type="datetime-local"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="ml-2 border p-1"
          />
        </label>
        <button
          className="border px-3 py-1"
          onClick={() =>
            onApply({
              reasonCodeIn: codes.length ? codes : undefined,
              kindIn: kinds.length ? kinds : undefined,
              sourceIn: sources.length ? sources : undefined,
              from: from || undefined,
              to: to || undefined,
              contains: contains || undefined,
            })
          }
        >
          Apply
        </button>

        <CopyCurlButton
          scope={scope}
          id={id}
          build={buildCurl}
          setCopied={setCopied}
          setBusy={setBusy}
          copied={copied}
          busy={busy}
        />

        {scope && id && (
          <>
            <button
              className="border px-3 py-1"
              disabled={!!exporting}
              onClick={async () => {
                if (!scope || !id) return;
                setExporting('json');
                try {
                  const filter: any = {};
                  if (codes.length) filter.reasonCodeIn = codes;
                  if (kinds.length) filter.kindIn = kinds;
                  if (sources.length) filter.sourceIn = sources;
                  if (from) filter.from = from;
                  if (to) filter.to = to;
                  if (contains && contains.trim().length)
                    filter.contains = contains.trim();
                  const variables: any = { format: 'json' };
                  if (scope === 'incident') variables.incidentId = id;
                  else variables.investigationId = id;
                  if (Object.keys(filter).length) variables.filter = filter;
                  const res = await exportProv({ variables });
                  const url = res.data?.exportProvenance?.url;
                  if (url) window.open(url, '_blank', 'noopener');
                } finally {
                  setExporting(null);
                }
              }}
              title="Export filtered provenance as JSON"
            >
              {exporting === 'json' ? 'Exporting…' : 'Export JSON'}
            </button>
            <button
              className="border px-3 py-1"
              disabled={!!exporting}
              onClick={async () => {
                if (!scope || !id) return;
                setExporting('csv');
                try {
                  const filter: any = {};
                  if (codes.length) filter.reasonCodeIn = codes;
                  if (kinds.length) filter.kindIn = kinds;
                  if (sources.length) filter.sourceIn = sources;
                  if (from) filter.from = from;
                  if (to) filter.to = to;
                  if (contains && contains.trim().length)
                    filter.contains = contains.trim();
                  const variables: any = { format: 'csv' };
                  if (scope === 'incident') variables.incidentId = id;
                  else variables.investigationId = id;
                  if (Object.keys(filter).length) variables.filter = filter;
                  const res = await exportProv({ variables });
                  const url = res.data?.exportProvenance?.url;
                  if (url) window.open(url, '_blank', 'noopener');
                } finally {
                  setExporting(null);
                }
              }}
              title="Export filtered provenance as CSV"
            >
              {exporting === 'csv' ? 'Exporting…' : 'Export CSV'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function CopyCurlButton({
  scope,
  id,
  build,
  setCopied,
  setBusy,
  copied,
  busy,
}: {
  scope?: 'incident' | 'investigation';
  id?: string;
  build: (s?: any, i?: any) => string;
  setCopied: (v: boolean) => void;
  setBusy: (v: boolean) => void;
  copied: boolean;
  busy: boolean;
}) {
  if (!scope || !id) return null;
  return (
    <button
      className="border px-3 py-1"
      disabled={busy}
      onClick={async () => {
        const cmd = build(scope, id);
        try {
          setBusy(true);
          await navigator.clipboard.writeText(cmd);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch (e) {
          // fallback: prompt
          window.prompt('Copy cURL', cmd);
        } finally {
          setBusy(false);
        }
      }}
      title="Copy GraphQL query as cURL"
    >
      {copied ? 'Copied!' : 'Copy as cURL'}
    </button>
  );
}
