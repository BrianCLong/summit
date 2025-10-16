// conductor-ui/frontend/src/views/pipelines/PipelineEditorView.tsx
import React, { useState, useEffect } from 'react';

// Mock API functions
const fetchTemplates = async () => {
  await new Promise((res) => setTimeout(res, 150));
  return [{ id: 'template-1', name: 'Standard Ingest & Process' }];
};

const fetchPlan = async (draft: any) => {
  console.log('Fetching plan for draft:', draft);
  await new Promise((res) => setTimeout(res, 500));
  return { estDuration: '15m', estCost: '\$2.50', sloFit: 'green' };
};

export const PipelineEditorView = () => {
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<any | null>(null);
  const [draft, setDraft] = useState<any | null>(null);
  const [plan, setPlan] = useState<any | null>(null);

  useEffect(() => {
    fetchTemplates().then(setTemplates);
  }, []);

  const handleSelectTemplate = (template: any) => {
    setSelectedTemplate(template);
    setDraft({ templateId: template.id, steps: {} }); // Initialize draft
    setPlan(null);
  };

  const handleGetPlan = async () => {
    if (draft) {
      const result = await fetchPlan(draft);
      setPlan(result);
    }
  };

  return (
    <div>
      <h1>Pipeline Editor v0</h1>
      {!selectedTemplate ? (
        <div>
          <h2>Select a Template</h2>
          <ul>
            {templates.map((t) => (
              <li key={t.id} onClick={() => handleSelectTemplate(t)}>
                {t.name}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div>
          <h2>Editing: {selectedTemplate.name}</h2>
          {/* Placeholder for step configuration UI */}
          <div
            style={{
              border: '1px dashed grey',
              padding: '1rem',
              margin: '1rem 0',
            }}
          >
            <p>Step configuration form will be here.</p>
          </div>
          <button onClick={handleGetPlan}>Preview Plan</button>
          {plan && (
            <div style={{ marginTop: '1rem' }}>
              <h3>Plan Preview</h3>
              <p>Est. Duration: {plan.estDuration}</p>
              <p>Est. Cost: {plan.estCost}</p>
              <p>
                SLO Fit: <span style={{ color: plan.sloFit }}>●</span>
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
