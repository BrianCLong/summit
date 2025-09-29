import React, { useMemo, useState } from 'react';

type Props =
  | { incidentId: string; investigationId?: never }
  | { incidentId?: never; investigationId: string };

export default function ExportAuditBundleButton(props: Props) {
  const [loading, setLoading] = useState(false);
  const { href, label } = useMemo(() => {
    if ('investigationId' in props) {
      return { href: `/audit/investigations/${props.investigationId}/audit-bundle.zip`, label: 'Download Audit Bundle' };
    }
    return { href: `/audit/incidents/${props.incidentId}/audit-bundle.zip`, label: 'Download Audit Bundle' };
  }, [props]);

  return (
    <button
      onClick={() => setLoading(true)}
      className="rounded-xl px-3 py-2 border shadow-sm hover:shadow bg-white"
      disabled={loading}
      title="Export includes IDs, hashes, and metadata (reasonCode, appealUrl). Sensitive payloads excluded."
    >
      {loading ? 'Preparing…' : label}
      {/* Hidden link to trigger download in a new tab without blocking UI */}
      <a href={href} className="hidden" target="_blank" rel="noreferrer" onLoad={() => setLoading(false)} />
    </button>
  );
}

