import React, { useState } from 'react';

interface PatternRunnerProps {
  onRun: (templateId: string, params: Record<string, unknown>) => void;
}

export const PatternRunner: React.FC<PatternRunnerProps> = ({ onRun }) => {
  const [templateId, setTemplateId] = useState('');
  const [paramsStr, setParamsStr] = useState('{}');

  const handleRun = () => {
    try {
      const params = JSON.parse(paramsStr);
      onRun(templateId, params);
    } catch (e) {
      alert('Invalid JSON params');
    }
  };

  return (
    <div className="intelgraph-pattern-runner p-4 border rounded">
      <h3>IntelGraph Pattern Runner</h3>
      <div className="flex flex-col gap-2">
        <label>
          Template ID:
          <input
            type="text"
            className="border p-1 w-full"
            value={templateId}
            onChange={(e) => setTemplateId(e.target.value)}
            placeholder="e.g. intelgraph.identity.shared-email-domain"
          />
        </label>
        <label>
          Parameters (JSON):
          <textarea
            className="border p-1 w-full"
            value={paramsStr}
            onChange={(e) => setParamsStr(e.target.value)}
            rows={4}
          />
        </label>
        <button
          className="bg-blue-500 text-white px-4 py-2 rounded"
          onClick={handleRun}
        >
          Run Pattern
        </button>
      </div>
    </div>
  );
};
