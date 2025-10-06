// Policy Editor - RBAC Phase 3
// Policy editor with preview, diff, and rollback capabilities

import React, { useState, useEffect } from 'react';
import { Alert, AlertDescription } from '../ui/alert';

interface PolicyVersion {
  id: string;
  version: number;
  content: string;
  author: string;
  timestamp: string;
  changes_summary: string;
  approved: boolean;
  approved_by?: string;
}

interface PolicyPreview {
  policy_id: string;
  current_version: string;
  proposed_version: string;
  diff: PolicyDiff;
  impact_analysis: ImpactAnalysis;
  risk_score: number;
}

interface PolicyDiff {
  added_rules: string[];
  removed_rules: string[];
  modified_rules: string[];
}

interface ImpactAnalysis {
  affected_users: number;
  affected_resources: number;
  permission_changes: {
    granted: number;
    revoked: number;
  };
  blast_radius: string; // low, medium, high, critical
}

export const PolicyEditor: React.FC = () => {
  const [policyId, setPolicyId] = useState<string>('');
  const [policyContent, setPolicyContent] = useState<string>('');
  const [policyVersions, setPolicyVersions] = useState<PolicyVersion[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<PolicyVersion | null>(null);
  const [preview, setPreview] = useState<PolicyPreview | null>(null);
  const [showPreview, setShowPreview] = useState<boolean>(false);
  const [showDiff, setShowDiff] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');

  // Load policy versions on mount
  useEffect(() => {
    if (policyId) {
      fetchPolicyVersions();
    }
  }, [policyId]);

  const fetchPolicyVersions = async () => {
    try {
      const response = await fetch(`/api/policies/${policyId}/versions`);
      if (!response.ok) throw new Error('Failed to fetch policy versions');
      const versions = await response.json();
      setPolicyVersions(versions);
      if (versions.length > 0) {
        setPolicyContent(versions[0].content);
        setSelectedVersion(versions[0]);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handlePreview = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/policies/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          policy_id: policyId,
          proposed_content: policyContent,
        }),
      });

      if (!response.ok) throw new Error('Failed to generate preview');

      const previewData = await response.json();
      setPreview(previewData);
      setShowPreview(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDiff = () => {
    if (selectedVersion) {
      setShowDiff(true);
    }
  };

  const handleApply = async () => {
    setLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      const response = await fetch('/api/policies/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          policy_id: policyId,
          content: policyContent,
          changes_summary: preview?.diff || {},
        }),
      });

      if (!response.ok) throw new Error('Failed to apply policy');

      const result = await response.json();
      setSuccessMessage(`Policy applied successfully. New version: ${result.version}`);
      fetchPolicyVersions(); // Refresh versions
      setShowPreview(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRollback = async (versionId: string) => {
    if (!confirm('Are you sure you want to rollback to this version?')) {
      return;
    }

    setLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      const response = await fetch('/api/policies/rollback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          policy_id: policyId,
          version_id: versionId,
        }),
      });

      if (!response.ok) throw new Error('Failed to rollback policy');

      const result = await response.json();
      setSuccessMessage(`Policy rolled back to version ${result.version}`);
      fetchPolicyVersions();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getRiskColor = (riskScore: number): string => {
    if (riskScore >= 80) return 'bg-red-100 text-red-800';
    if (riskScore >= 60) return 'bg-orange-100 text-orange-800';
    if (riskScore >= 40) return 'bg-yellow-100 text-yellow-800';
    return 'bg-green-100 text-green-800';
  };

  const getBlastRadiusColor = (radius: string): string => {
    const colors: Record<string, string> = {
      critical: 'text-red-600',
      high: 'text-orange-600',
      medium: 'text-yellow-600',
      low: 'text-green-600',
    };
    return colors[radius] || 'text-gray-600';
  };

  return (
    <div className="policy-editor p-6 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Policy Editor - RBAC Phase 3</h1>

      {/* Error/Success Messages */}
      {error && (
        <Alert className="mb-4 border-red-500 bg-red-50">
          <AlertDescription className="text-red-800">{error}</AlertDescription>
        </Alert>
      )}
      {successMessage && (
        <Alert className="mb-4 border-green-500 bg-green-50">
          <AlertDescription className="text-green-800">{successMessage}</AlertDescription>
        </Alert>
      )}

      {/* Policy Selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">Policy ID</label>
        <input
          type="text"
          value={policyId}
          onChange={(e) => setPolicyId(e.target.value)}
          placeholder="Enter policy ID (e.g., abac.enhanced)"
          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Policy Editor */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div>
          <label className="block text-sm font-medium mb-2">Policy Content (Rego)</label>
          <textarea
            value={policyContent}
            onChange={(e) => setPolicyContent(e.target.value)}
            rows={20}
            className="w-full px-4 py-2 border border-gray-300 rounded-md font-mono text-sm focus:ring-2 focus:ring-blue-500"
            placeholder="Enter policy content in Rego format..."
          />
        </div>

        {/* Version History */}
        <div>
          <label className="block text-sm font-medium mb-2">Version History</label>
          <div className="border border-gray-300 rounded-md p-4 h-[500px] overflow-y-auto">
            {policyVersions.length === 0 ? (
              <p className="text-gray-500">No versions available</p>
            ) : (
              policyVersions.map((version) => (
                <div
                  key={version.id}
                  className="mb-4 p-3 border border-gray-200 rounded-md cursor-pointer hover:bg-gray-50"
                  onClick={() => {
                    setSelectedVersion(version);
                    setPolicyContent(version.content);
                  }}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-semibold">Version {version.version}</span>
                    {version.approved && (
                      <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                        Approved
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{version.changes_summary}</p>
                  <div className="text-xs text-gray-500">
                    <p>By: {version.author}</p>
                    <p>At: {new Date(version.timestamp).toLocaleString()}</p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRollback(version.id);
                    }}
                    className="mt-2 px-3 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600"
                  >
                    Rollback to this version
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4 mb-6">
        <button
          onClick={handlePreview}
          disabled={loading || !policyContent}
          className="px-6 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          {loading ? 'Loading...' : 'Preview Changes'}
        </button>
        <button
          onClick={handleDiff}
          disabled={!selectedVersion || !policyContent}
          className="px-6 py-2 bg-purple-500 text-white rounded-md hover:bg-purple-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          Show Diff
        </button>
        <button
          onClick={handleApply}
          disabled={loading || !preview}
          className="px-6 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          Apply Policy
        </button>
      </div>

      {/* Preview Panel */}
      {showPreview && preview && (
        <div className="border border-blue-300 rounded-lg p-6 bg-blue-50 mb-6">
          <h2 className="text-xl font-semibold mb-4">Policy Change Preview</h2>

          {/* Risk Score */}
          <div className="mb-4">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium">Risk Score:</span>
              <span className={`px-4 py-2 rounded-md font-bold ${getRiskColor(preview.risk_score)}`}>
                {preview.risk_score}/100
              </span>
            </div>
          </div>

          {/* Impact Analysis */}
          <div className="mb-4">
            <h3 className="font-semibold mb-2">Impact Analysis</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p>Affected Users: <strong>{preview.impact_analysis.affected_users}</strong></p>
                <p>Affected Resources: <strong>{preview.impact_analysis.affected_resources}</strong></p>
              </div>
              <div>
                <p>Permissions Granted: <strong className="text-green-600">+{preview.impact_analysis.permission_changes.granted}</strong></p>
                <p>Permissions Revoked: <strong className="text-red-600">-{preview.impact_analysis.permission_changes.revoked}</strong></p>
              </div>
            </div>
            <p className="mt-2">
              Blast Radius: <strong className={getBlastRadiusColor(preview.impact_analysis.blast_radius)}>
                {preview.impact_analysis.blast_radius.toUpperCase()}
              </strong>
            </p>
          </div>

          {/* Policy Diff */}
          <div>
            <h3 className="font-semibold mb-2">Changes</h3>
            {preview.diff.added_rules.length > 0 && (
              <div className="mb-2">
                <p className="text-sm font-medium text-green-600">Added Rules:</p>
                <ul className="list-disc list-inside text-sm">
                  {preview.diff.added_rules.map((rule, idx) => (
                    <li key={idx} className="text-green-700">{rule}</li>
                  ))}
                </ul>
              </div>
            )}
            {preview.diff.removed_rules.length > 0 && (
              <div className="mb-2">
                <p className="text-sm font-medium text-red-600">Removed Rules:</p>
                <ul className="list-disc list-inside text-sm">
                  {preview.diff.removed_rules.map((rule, idx) => (
                    <li key={idx} className="text-red-700">{rule}</li>
                  ))}
                </ul>
              </div>
            )}
            {preview.diff.modified_rules.length > 0 && (
              <div className="mb-2">
                <p className="text-sm font-medium text-orange-600">Modified Rules:</p>
                <ul className="list-disc list-inside text-sm">
                  {preview.diff.modified_rules.map((rule, idx) => (
                    <li key={idx} className="text-orange-700">{rule}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Warning for high-risk changes */}
          {preview.risk_score >= 80 && (
            <Alert className="mt-4 border-red-500 bg-red-50">
              <AlertDescription className="text-red-800">
                <strong>⚠️ HIGH RISK CHANGE</strong> - This policy change has a critical blast radius.
                Consider staging the change or requiring additional approvals.
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}

      {/* Diff Panel */}
      {showDiff && selectedVersion && (
        <div className="border border-gray-300 rounded-lg p-6 bg-gray-50 mb-6">
          <h2 className="text-xl font-semibold mb-4">Policy Diff</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="font-semibold mb-2">Current (Version {selectedVersion.version})</h3>
              <pre className="bg-white p-4 rounded border border-gray-200 text-xs overflow-x-auto">
                {selectedVersion.content}
              </pre>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Proposed</h3>
              <pre className="bg-white p-4 rounded border border-gray-200 text-xs overflow-x-auto">
                {policyContent}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* Change Log */}
      <div className="border border-gray-300 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Change Log</h2>
        <p className="text-sm text-gray-600">
          All policy changes are tracked with approval status, author, and timestamp.
          Rollback capability allows reverting to any previous version with full audit trail.
        </p>
      </div>
    </div>
  );
};

export default PolicyEditor;
