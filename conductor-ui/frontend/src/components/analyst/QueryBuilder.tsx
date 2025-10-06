import React, { useState } from 'react';
import { Alert, AlertDescription } from '../ui/alert';

interface QueryCondition {
  field: string;
  operator: string;
  value: string;
}

interface PolicyPreview {
  allowed: boolean;
  reason: string;
  requiredStepUp: boolean;
  dlpViolations?: string[];
}

export const QueryBuilder: React.FC = () => {
  const [conditions, setConditions] = useState<QueryCondition[]>([
    { field: '', operator: '', value: '' }
  ]);
  const [policyPreview, setPolicyPreview] = useState<PolicyPreview | null>(null);
  const [isPreviewingExport, setIsPreviewingExport] = useState(false);

  const fieldOptions = [
    { value: 'entity.type', label: 'Entity Type' },
    { value: 'entity.classification', label: 'Classification' },
    { value: 'relationship.type', label: 'Relationship Type' },
    { value: 'timestamp', label: 'Timestamp' },
    { value: 'confidence', label: 'Confidence Score' },
  ];

  const operatorOptions = [
    { value: 'equals', label: 'Equals' },
    { value: 'contains', label: 'Contains' },
    { value: 'greater_than', label: 'Greater Than' },
    { value: 'less_than', label: 'Less Than' },
  ];

  const addCondition = () => {
    setConditions([...conditions, { field: '', operator: '', value: '' }]);
  };

  const removeCondition = (index: number) => {
    setConditions(conditions.filter((_, i) => i !== index));
  };

  const updateCondition = (index: number, field: keyof QueryCondition, value: string) => {
    const newConditions = [...conditions];
    newConditions[index][field] = value;
    setConditions(newConditions);
  };

  const previewExportPolicy = async () => {
    setIsPreviewingExport(true);

    // Call OPA policy endpoint to preview export
    try {
      const response = await fetch('/api/policy/preview-export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: conditions,
          action: 'export',
          stepUpToken: localStorage.getItem('stepUpToken')
        })
      });

      const result = await response.json();
      setPolicyPreview(result);
    } catch (error) {
      setPolicyPreview({
        allowed: false,
        reason: 'Error checking policy: ' + error,
        requiredStepUp: false
      });
    } finally {
      setIsPreviewingExport(false);
    }
  };

  const executeQuery = async () => {
    // Execute the actual query
    const response = await fetch('/api/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conditions })
    });

    const results = await response.json();
    console.log('Query results:', results);
  };

  return (
    <div className="query-builder p-4 space-y-4">
      <h2 className="text-2xl font-bold">Analyst Query Builder</h2>

      <div className="conditions-container space-y-3">
        {conditions.map((condition, index) => (
          <div key={index} className="condition-row flex gap-2 items-center">
            <select
              value={condition.field}
              onChange={(e) => updateCondition(index, 'field', e.target.value)}
              className="flex-1 p-2 border rounded"
            >
              <option value="">Select field...</option>
              {fieldOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>

            <select
              value={condition.operator}
              onChange={(e) => updateCondition(index, 'operator', e.target.value)}
              className="flex-1 p-2 border rounded"
            >
              <option value="">Select operator...</option>
              {operatorOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>

            <input
              type="text"
              value={condition.value}
              onChange={(e) => updateCondition(index, 'value', e.target.value)}
              placeholder="Value..."
              className="flex-1 p-2 border rounded"
            />

            {conditions.length > 1 && (
              <button
                onClick={() => removeCondition(index)}
                className="px-3 py-2 bg-red-500 text-white rounded hover:bg-red-600"
              >
                Remove
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="actions flex gap-2">
        <button
          onClick={addCondition}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Add Condition
        </button>

        <button
          onClick={executeQuery}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
        >
          Execute Query
        </button>

        <button
          onClick={previewExportPolicy}
          disabled={isPreviewingExport}
          className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50"
        >
          {isPreviewingExport ? 'Checking Policy...' : 'Preview Export Policy'}
        </button>
      </div>

      {policyPreview && (
        <Alert className={policyPreview.allowed ? 'border-green-500' : 'border-red-500'}>
          <AlertDescription>
            <div className="space-y-2">
              <div className="font-bold">
                {policyPreview.allowed ? '✅ Export Allowed' : '🚫 Export Blocked'}
              </div>
              <div className="text-sm">
                <strong>Reason:</strong> {policyPreview.reason}
              </div>
              {policyPreview.requiredStepUp && (
                <div className="text-sm text-amber-600">
                  ⚠️ Step-up authentication required for this export
                </div>
              )}
              {policyPreview.dlpViolations && policyPreview.dlpViolations.length > 0 && (
                <div className="text-sm">
                  <strong>DLP Violations:</strong>
                  <ul className="list-disc list-inside">
                    {policyPreview.dlpViolations.map((v, i) => (
                      <li key={i}>{v}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};
