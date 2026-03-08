import type { ArtifactStatus } from '../types';

const ARTIFACT_STYLES: Record<ArtifactStatus, string> = {
  merged:      'badge-green',
  superseded:  'badge-blue',
  quarantined: 'badge-red',
  abandoned:   'badge-grey',
};

export function ArtifactBadge({ status }: { status: ArtifactStatus }) {
  return <span className={`badge ${ARTIFACT_STYLES[status] ?? 'badge-grey'}`}>{status}</span>;
}

type Severity = 'error' | 'warning' | 'info';
const SEV_ICONS: Record<Severity, string> = { error: '✖', warning: '⚠', info: 'ℹ' };
const SEV_STYLES: Record<Severity, string> = {
  error: 'badge-red', warning: 'badge-yellow', info: 'badge-blue',
};
export function SeverityBadge({ severity }: { severity: Severity }) {
  return (
    <span className={`badge ${SEV_STYLES[severity]}`} aria-label={`${severity} severity`}>
      {SEV_ICONS[severity]} {severity}
    </span>
  );
}

type PolicyResult = 'pass' | 'fail' | 'warn' | 'unknown';
export function PolicyBadge({ result }: { result: PolicyResult }) {
  const icons: Record<PolicyResult, string> = { pass: '✔', fail: '✖', warn: '⚠', unknown: '?' };
  const styles: Record<PolicyResult, string> = {
    pass: 'badge-green', fail: 'badge-red', warn: 'badge-yellow', unknown: 'badge-grey',
  };
  return <span className={`badge ${styles[result]}`}>{icons[result]} {result}</span>;
}
