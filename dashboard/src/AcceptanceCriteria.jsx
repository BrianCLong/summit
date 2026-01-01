import React from 'react';

const AcceptanceCriteria = () => {
  const criteria = [
    {
      id: 'er-explain',
      title: 'ER Explainability',
      status: 'passed',
      description: 'Merge decisions show features, scores, and human overrides with full audit trail'
    },
    {
      id: 'hypothesis',
      title: 'Hypothesis Rigor',
      status: 'warning',
      description: 'Most briefs show competing hypotheses, some missing residual unknowns documentation'
    },
    {
      id: 'policy-default',
      title: 'Policy-by-Default',
      status: 'passed',
      description: 'Blocked actions consistently show reason + clear appeal path'
    },
    {
      id: 'provenance',
      title: 'Provenance Integrity',
      status: 'passed',
      description: 'Exports include complete manifest with cryptographic hashes'
    }
  ];

  return (
    <div className="acceptance-criteria">
      <h2>Acceptance Criteria Patterns</h2>
      <div className="criteria-grid">
        {criteria.map((item) => (
          <div key={item.id} className={`criteria-item ${item.status}`}>
            <h4>
              {item.status === 'passed' && '✅ '}
              {item.status === 'warning' && '⚠️ '}
              {item.status === 'failed' && '❌ '}
              {item.title}
            </h4>
            <p>{item.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AcceptanceCriteria;