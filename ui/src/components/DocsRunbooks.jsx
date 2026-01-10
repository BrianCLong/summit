import React from 'react';

const Card = ({ title, children, actions, className = '' }) => (
  <div className={`glass-card rounded-xl shadow-lg bg-white ${className}`} role="region" aria-labelledby={`card-title-${title.replace(/\s+/g, '-').toLowerCase()}`}>
    <div className="flex items-center justify-between p-4 border-b border-gray-100">
      <h3 id={`card-title-${title.replace(/\s+/g, '-').toLowerCase()}`} className="text-lg font-semibold text-gray-900">
        {title}
      </h3>
      {actions && (
        <div className="flex items-center space-x-2">{actions}</div>
      )}
    </div>
    <div className="p-4">{children}</div>
  </div>
);

const DocsRunbooks = () => {
  const sections = [
    {
      title: 'Onboarding',
      items: [
        'Quick Start Guide',
        'Architecture Overview',
        'Local Development Setup',
        'Model Configuration',
      ],
    },
    {
      title: 'Incident Playbooks',
      items: [
        'Model Outage Response',
        'High Latency Troubleshooting',
        'Budget Limit Exceeded',
        'RAG Index Corruption',
      ],
    },
    {
      title: 'Release Checklist',
      items: [
        'Pre-deployment Verification',
        'Model Validation Tests',
        'Performance Benchmarks',
        'Rollback Procedures',
      ],
    },
  ];

  return (
    <div className="space-y-6">
      {/* Architecture Diagram Placeholder */}
      <Card title="Component & Deployment">
        <div className="text-center p-12 text-gray-500 bg-gray-50 rounded-lg border-2 border-dashed">
          Architecture diagram visualization would appear here
        </div>
      </Card>

      {/* Documentation Sections */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {sections.map((section, index) => (
          <Card key={index} title={section.title}>
            <ul className="space-y-2">
              {section.items.map((item, itemIndex) => (
                <li key={itemIndex}>
                  <a
                    href="#"
                    className="text-blue-600 hover:text-blue-800 hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500 rounded block"
                  >
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default DocsRunbooks;