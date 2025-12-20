import React, { useMemo, useState } from 'react';

/**
 * Props for the ExportAuditBundleButton component.
 * Can either provide an `incidentId` or an `investigationId`.
 */
type Props =
  | { incidentId: string; investigationId?: never }
  | { incidentId?: never; investigationId: string };

/**
 * A button component that triggers the download of an audit bundle.
 * Supports exporting audit bundles for either an incident or an investigation.
 * The export includes IDs, hashes, and metadata, excluding sensitive payloads.
 *
 * @param props - The component props.
 * @returns The rendered ExportAuditBundleButton component.
 */
export default function ExportAuditBundleButton(props: Props) {
  const [loading, setLoading] = useState(false);
  const { href, label } = useMemo(() => {
    if ('investigationId' in props) {
      return {
        href: `/audit/investigations/${props.investigationId}/audit-bundle.zip`,
        label: 'Download Audit Bundle',
      };
    }
    return {
      href: `/audit/incidents/${props.incidentId}/audit-bundle.zip`,
      label: 'Download Audit Bundle',
    };
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
      <a
        href={href}
        className="hidden"
        target="_blank"
        rel="noreferrer"
        onLoad={() => setLoading(false)}
      />
    </button>
  );
}
