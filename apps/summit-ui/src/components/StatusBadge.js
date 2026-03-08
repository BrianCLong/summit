"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ArtifactBadge = ArtifactBadge;
exports.SeverityBadge = SeverityBadge;
exports.PolicyBadge = PolicyBadge;
const ARTIFACT_STYLES = {
    merged: 'badge-green',
    superseded: 'badge-blue',
    quarantined: 'badge-red',
    abandoned: 'badge-grey',
};
function ArtifactBadge({ status }) {
    return <span className={`badge ${ARTIFACT_STYLES[status] ?? 'badge-grey'}`}>{status}</span>;
}
const SEV_ICONS = { error: '✖', warning: '⚠', info: 'ℹ' };
const SEV_STYLES = {
    error: 'badge-red', warning: 'badge-yellow', info: 'badge-blue',
};
function SeverityBadge({ severity }) {
    return (<span className={`badge ${SEV_STYLES[severity]}`} aria-label={`${severity} severity`}>
      {SEV_ICONS[severity]} {severity}
    </span>);
}
function PolicyBadge({ result }) {
    const icons = { pass: '✔', fail: '✖', warn: '⚠', unknown: '?' };
    const styles = {
        pass: 'badge-green', fail: 'badge-red', warn: 'badge-yellow', unknown: 'badge-grey',
    };
    return <span className={`badge ${styles[result]}`}>{icons[result]} {result}</span>;
}
