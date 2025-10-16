import React, { useState } from 'react';
import { Alert, AlertDescription } from '../ui/alert';
import { ExplainabilityPanel } from './ExplainabilityPanel';

interface ExportFormat {
  format: 'json' | 'csv' | 'graphml' | 'pdf';
  includeProvenance: boolean;
  includeMetadata: boolean;
}

interface PolicyOutcome {
  decision: 'allow' | 'deny';
  reason: string;
  rule_id: string;
  evidence?: string[];
  remediation?: string;
}

export const ExportRequest: React.FC = () => {
  const [exportFormat, setExportFormat] = useState<ExportFormat>({
    format: 'json',
    includeProvenance: true,
    includeMetadata: true,
  });
  const [policyCheck, setPolicyCheck] = useState<PolicyOutcome | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [stepUpRequired, setStepUpRequired] = useState(false);

  const checkExportPolicy = async () => {
    setIsChecking(true);

    try {
      const response = await fetch('/api/export/policy-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          format: exportFormat.format,
          includeProvenance: exportFormat.includeProvenance,
          stepUpToken: localStorage.getItem('stepUpToken'),
        }),
      });

      const result = await response.json();
      setPolicyCheck(result.outcome);
      setStepUpRequired(result.requiresStepUp || false);
    } catch (error) {
      setPolicyCheck({
        decision: 'deny',
        reason: 'Error checking export policy: ' + error,
        rule_id: 'error',
      });
    } finally {
      setIsChecking(false);
    }
  };

  const requestStepUp = async () => {
    // Trigger step-up authentication
    window.dispatchEvent(
      new CustomEvent('request-stepup', {
        detail: { reason: 'Export requires additional authentication' },
      }),
    );
  };

  const executeExport = async () => {
    if (policyCheck?.decision !== 'allow') {
      alert(
        'Export is not allowed by policy. Please check the policy outcome.',
      );
      return;
    }

    setIsExporting(true);

    try {
      const response = await fetch('/api/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Step-Up-Token': localStorage.getItem('stepUpToken') || '',
        },
        body: JSON.stringify(exportFormat),
      });

      if (!response.ok) {
        throw new Error(`Export failed: ${response.statusText}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `export.${exportFormat.format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      alert('Export completed successfully!');
    } catch (error) {
      alert('Export failed: ' + error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="export-request p-4 space-y-4">
      <h2 className="text-2xl font-bold">Export Data</h2>

      <div className="format-options space-y-3">
        <div>
          <label className="block text-sm font-medium mb-1">
            Export Format
          </label>
          <select
            value={exportFormat.format}
            onChange={(e) =>
              setExportFormat({
                ...exportFormat,
                format: e.target.value as any,
              })
            }
            className="w-full p-2 border rounded"
          >
            <option value="json">JSON</option>
            <option value="csv">CSV</option>
            <option value="graphml">GraphML</option>
            <option value="pdf">PDF Report</option>
          </select>
        </div>

        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={exportFormat.includeProvenance}
              onChange={(e) =>
                setExportFormat({
                  ...exportFormat,
                  includeProvenance: e.target.checked,
                })
              }
            />
            <span className="text-sm">Include Provenance</span>
          </label>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={exportFormat.includeMetadata}
              onChange={(e) =>
                setExportFormat({
                  ...exportFormat,
                  includeMetadata: e.target.checked,
                })
              }
            />
            <span className="text-sm">Include Metadata</span>
          </label>
        </div>
      </div>

      <div className="actions flex gap-2">
        <button
          onClick={checkExportPolicy}
          disabled={isChecking}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {isChecking ? 'Checking Policy...' : 'Check Export Policy'}
        </button>

        {policyCheck?.decision === 'allow' && (
          <button
            onClick={executeExport}
            disabled={isExporting}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
          >
            {isExporting ? 'Exporting...' : 'Execute Export'}
          </button>
        )}

        {stepUpRequired && policyCheck?.decision === 'deny' && (
          <button
            onClick={requestStepUp}
            className="px-4 py-2 bg-amber-500 text-white rounded hover:bg-amber-600"
          >
            🔐 Authenticate to Export
          </button>
        )}
      </div>

      {policyCheck && (
        <ExplainabilityPanel
          policyOutcome={policyCheck}
          queryContext={{ exportFormat }}
        />
      )}

      <div className="info-box mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
        <h4 className="font-semibold text-sm text-blue-800 mb-2">
          Export Policy Preview
        </h4>
        <div className="text-sm text-blue-700 space-y-1">
          <p>• Exports are subject to OPA policy evaluation</p>
          <p>• High-classification data may require step-up authentication</p>
          <p>• DLP policies will scan for sensitive data patterns</p>
          <p>• All exports are logged with provenance tracking</p>
        </div>
      </div>
    </div>
  );
};
