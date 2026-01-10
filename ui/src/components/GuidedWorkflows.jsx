import React, { useMemo, useState } from 'react';

const sampleWorkflows = [
  {
    id: 'data-to-graph',
    name: 'Data Extraction → Graph Ingest',
    risk: 'medium',
    description: 'Guided wizard to collect data, normalize, resolve entities, and ingest to the graph.',
    steps: [
      {
        id: 'ingest-source',
        title: 'Collect source material',
        prompt: 'Upload or link the dataset and describe provenance.',
        inputSchema: {
          type: 'object',
          required: ['source_url', 'format'],
          properties: {
            source_url: { type: 'string', format: 'uri', title: 'Source URL' },
            format: { type: 'string', enum: ['csv', 'json', 'xlsx'], title: 'Format' },
            notes: { type: 'string', title: 'Notes' },
          },
        },
        tool: 'http_head',
      },
      {
        id: 'normalize-records',
        title: 'Normalize schema',
        prompt: 'Confirm canonical fields and business keys to normalize extracted rows.',
        inputSchema: {
          type: 'object',
          required: ['primary_key', 'columns'],
          properties: {
            primary_key: { type: 'string', title: 'Primary key field' },
            columns: { type: 'string', title: 'Columns (comma separated)' },
            null_policy: { type: 'string', title: 'Null handling' },
          },
        },
        tool: 'dns_lookup',
      },
      {
        id: 'resolve-entities',
        title: 'Resolve entities',
        prompt: 'Confirm entity resolution match keys and thresholds.',
        inputSchema: {
          type: 'object',
          required: ['entity_name_field', 'similarity_threshold'],
          properties: {
            entity_name_field: { type: 'string', title: 'Entity name field' },
            similarity_threshold: { type: 'number', title: 'Similarity threshold (0-1)' },
            blocklist: { type: 'string', title: 'Blocklisted values (comma separated)' },
          },
        },
        tool: 'local_grep',
      },
      {
        id: 'graph-ingest',
        title: 'Graph ingest',
        prompt: 'Send normalized entities and relationships to the graph with lineage notes.',
        inputSchema: {
          type: 'object',
          required: ['graph_name', 'batch_size'],
          properties: {
            graph_name: { type: 'string', title: 'Graph target/URL' },
            batch_size: { type: 'integer', title: 'Batch size' },
            dry_run: { type: 'boolean', title: 'Dry run only' },
          },
        },
        tool: 'http_head',
      },
    ],
  },
  {
    id: 'docset-claim-report',
    name: 'Doc Set → Summary → Claim-check → Report',
    risk: 'low',
    description: 'Summaries, claim-checks, and report packaging with citations.',
    steps: [
      {
        id: 'collect-docs',
        title: 'Collect documents',
        prompt: 'Provide document links and target audience.',
        inputSchema: {
          type: 'object',
          required: ['audience', 'sources'],
          properties: {
            audience: { type: 'string', title: 'Audience' },
            sources: { type: 'string', title: 'Sources (comma separated URLs)' },
            constraints: { type: 'string', title: 'Constraints' },
          },
        },
        tool: 'http_head',
      },
      {
        id: 'summarize',
        title: 'Summarize documents',
        prompt: 'Produce concise summaries.',
        inputSchema: {
          type: 'object',
          required: ['summary_style'],
          properties: {
            summary_style: { type: 'string', title: 'Summary style' },
            keep_quotes: { type: 'boolean', title: 'Keep quotes' },
          },
        },
        tool: 'local_grep',
      },
      {
        id: 'claim-check',
        title: 'Claim check',
        prompt: 'List factual claims and mark supporting sources.',
        inputSchema: {
          type: 'object',
          required: ['citation_policy'],
          properties: {
            citation_policy: { type: 'string', title: 'Citation policy' },
            minimum_sources: { type: 'integer', title: 'Minimum sources' },
          },
        },
        tool: 'dns_lookup',
      },
      {
        id: 'report',
        title: 'Produce report',
        prompt: 'Assemble the final report with citations.',
        inputSchema: {
          type: 'object',
          required: ['report_title', 'delivery_format'],
          properties: {
            report_title: { type: 'string', title: 'Report title' },
            delivery_format: { type: 'string', enum: ['markdown', 'docx', 'pdf'], title: 'Format' },
            include_appendix: { type: 'boolean', title: 'Include appendix' },
          },
        },
        tool: 'http_head',
      },
    ],
  },
];

const renderField = (key, schema, value, onChange) => {
  const label = schema.title || key;
  const parseNumeric = (raw, type) => {
    if (raw === '') return '';
    const numeric = type === 'integer' ? parseInt(raw, 10) : Number(raw);
    return Number.isNaN(numeric) ? '' : numeric;
  };
  const commonProps = {
    id: key,
    name: key,
    className: 'w-full px-3 py-2 border border-gray-300 rounded focus:ring focus:ring-blue-200 text-sm',
    value: value ?? '',
    onChange: (e) => {
      if (schema.type === 'integer' || schema.type === 'number') {
        onChange(key, parseNumeric(e.target.value, schema.type));
      } else {
        onChange(key, e.target.value);
      }
    },
  };

  if (schema.type === 'boolean') {
    return (
      <label className="flex items-center space-x-2" key={key}>
        <input
          type="checkbox"
          checked={Boolean(value)}
          onChange={(e) => onChange(key, e.target.checked)}
          className="rounded"
        />
        <span className="text-sm text-gray-800">{label}</span>
      </label>
    );
  }

  if (schema.enum) {
    return (
      <label className="block space-y-1" key={key}>
        <span className="text-xs font-medium text-gray-700">{label}</span>
        <select {...commonProps}>
          <option value="">Select...</option>
          {schema.enum.map((option) => (
            <option value={option} key={option}>
              {option}
            </option>
          ))}
        </select>
      </label>
    );
  }

  if (schema.type === 'array') {
    return (
      <label className="block space-y-1" key={key}>
        <span className="text-xs font-medium text-gray-700">{label}</span>
        <textarea
          className="w-full px-3 py-2 border border-gray-300 rounded focus:ring focus:ring-blue-200 text-sm"
          placeholder={schema.placeholder || 'Comma-separated values'}
          value={Array.isArray(value) ? value.join(', ') : value ?? ''}
          onChange={(e) => {
            const entries = e.target.value
              .split(',')
              .map((entry) => entry.trim())
              .filter(Boolean);
            onChange(key, entries);
          }}
          rows={3}
        />
      </label>
    );
  }

  return (
    <label className="block space-y-1" key={key}>
      <span className="text-xs font-medium text-gray-700">{label}</span>
      <input type={schema.type === 'integer' || schema.type === 'number' ? 'number' : 'text'} placeholder={schema.placeholder} {...commonProps} />
    </label>
  );
};

const GuidedWorkflows = () => {
  const [selectedId, setSelectedId] = useState(sampleWorkflows[0].id);
  const [stepIndex, setStepIndex] = useState(0);
  const [responses, setResponses] = useState({});
  const [trace, setTrace] = useState([]);
  const [artifacts, setArtifacts] = useState([]);
  const [status, setStatus] = useState('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const featureEnabled = (window.__featureFlags && window.__featureFlags['guidedWorkflows.enabled']) ?? true;

  const workflow = useMemo(
    () => sampleWorkflows.find((wf) => wf.id === selectedId) ?? sampleWorkflows[0],
    [selectedId],
  );

  const currentStep = workflow.steps[stepIndex];

  const handleChange = (field, value) => {
    setErrorMessage('');
    setResponses((prev) => ({
      ...prev,
      [currentStep.id]: {
        ...(prev[currentStep.id] || {}),
        [field]: value,
      },
    }));
  };

  const appendTrace = (type, message, data = {}) => {
    setTrace((prev) => [...prev, { type, message, data, ts: new Date().toISOString() }]);
  };

  const runTool = () => {
    appendTrace('tool-dispatch', `${currentStep.tool} dispatched`, responses[currentStep.id]);
    appendTrace('tool-result', `${currentStep.tool} completed`, { evidence: `ev-${currentStep.id}-${trace.length + 1}` });
    setArtifacts((prev) => [
      ...prev,
      { id: `artifact-${currentStep.id}-${prev.length + 1}`, description: `${currentStep.title} output`, status: 'ready' },
    ]);
  };

  const nextStep = () => {
    if (!currentStep) return;
    const required = currentStep.inputSchema.required || [];
    const stepValues = responses[currentStep.id] || {};
    const missing = required.filter((field) => {
      const value = stepValues[field];
      if (value === undefined || value === null) return true;
      if (typeof value === 'string') return value.trim() === '';
      if (Array.isArray(value)) return value.length === 0;
      return false;
    });
    if (missing.length > 0) {
      const message = `Missing required fields: ${missing.join(', ')}`;
      setErrorMessage(message);
      appendTrace('validation', message, stepValues);
      return;
    }

    appendTrace('step-complete', `${currentStep.title} answered`, responses[currentStep.id]);
    runTool();

    if (stepIndex < workflow.steps.length - 1) {
      setStepIndex(stepIndex + 1);
    } else {
      setStatus('complete');
      appendTrace('complete', 'Workflow finished');
    }
  };

  const reset = () => {
    setResponses({});
    setTrace([]);
    setArtifacts([]);
    setStepIndex(0);
    setStatus('idle');
    setErrorMessage('');
  };

  if (!featureEnabled) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 text-yellow-900 p-4 rounded">
        guidedWorkflows.enabled is disabled. Enable the feature flag to access the chat wizard.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Guided Workflows</h2>
          <p className="text-sm text-gray-600">Chat-like wizard that routes to tools, persists traces, and produces artifacts.</p>
        </div>
        <div className="flex items-center space-x-2">
          <label className="text-xs text-gray-600">Workflow</label>
          <select
            className="px-3 py-2 border border-gray-300 rounded text-sm"
            value={selectedId}
            onChange={(e) => {
              setSelectedId(e.target.value);
              reset();
            }}
          >
            {sampleWorkflows.map((wf) => (
              <option key={wf.id} value={wf.id}>
                {wf.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2 bg-white border border-gray-200 rounded-lg p-4 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Step {stepIndex + 1} of {workflow.steps.length}</p>
              <h3 className="text-lg font-semibold text-gray-900">{currentStep.title}</h3>
              <p className="text-sm text-gray-700 mt-1">{currentStep.prompt}</p>
            </div>
            <div className="text-xs px-2 py-1 rounded bg-blue-50 text-blue-800">Tool: {currentStep.tool}</div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {Object.entries(currentStep.inputSchema.properties).map(([key, schema]) =>
              renderField(key, schema, (responses[currentStep.id] || {})[key], handleChange),
            )}
          </div>
          {errorMessage && (
            <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {errorMessage}
            </div>
          )}

          <div className="flex items-center space-x-2">
            <button
              className="px-4 py-2 bg-blue-600 text-white rounded shadow hover:bg-blue-700 text-sm"
              onClick={nextStep}
              disabled={status === 'complete'}
            >
              {stepIndex < workflow.steps.length - 1 ? 'Next step' : 'Finish workflow'}
            </button>
            <button className="px-3 py-2 text-sm text-gray-700 hover:underline" onClick={reset}>
              Reset
            </button>
          </div>
        </div>

        <div className="space-y-3">
          <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm">
            <h4 className="text-sm font-semibold text-gray-900 mb-2">Progress</h4>
            <ol className="space-y-2 text-sm">
              {workflow.steps.map((step, idx) => (
                <li
                  key={step.id}
                  className={`flex items-start space-x-2 ${idx === stepIndex ? 'text-blue-700' : 'text-gray-700'}`}
                >
                  <span className={`mt-1 h-2 w-2 rounded-full ${idx <= stepIndex ? 'bg-blue-600' : 'bg-gray-300'}`}></span>
                  <div>
                    <p className="font-medium">{step.title}</p>
                    <p className="text-xs text-gray-500">{step.prompt}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm">
            <h4 className="text-sm font-semibold text-gray-900 mb-2">Artifacts</h4>
            {artifacts.length === 0 ? (
              <p className="text-xs text-gray-600">Artifacts will appear after each tool call.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {artifacts.map((artifact) => (
                  <li key={artifact.id} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{artifact.description}</p>
                      <p className="text-xs text-gray-500">{artifact.id}</p>
                    </div>
                    <span className="text-xs px-2 py-1 rounded bg-green-50 text-green-800">{artifact.status}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm">
            <h4 className="text-sm font-semibold text-gray-900 mb-2">Action trace</h4>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {trace.length === 0 && <p className="text-xs text-gray-500">Trace will stream as you progress.</p>}
              {trace.map((entry, idx) => (
                <div key={`${entry.type}-${idx}`} className="border-l-2 border-blue-200 pl-2">
                  <p className="text-xs text-gray-700">
                    <span className="font-semibold">{entry.type}</span> — {entry.message}
                  </p>
                  <p className="text-[10px] text-gray-500">{new Date(entry.ts).toLocaleTimeString()}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GuidedWorkflows;
