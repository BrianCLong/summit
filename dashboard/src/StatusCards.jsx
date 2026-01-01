import React from 'react';

const StatusCards = () => {
  const statusMetrics = [
    {
      id: 'er-precision',
      title: 'ER Precision@10',
      value: '87.3%',
      target: '≥90%',
      status: 'warning',
      progress: 87.3
    },
    {
      id: 'explainability',
      title: 'Explainability Coverage',
      value: '96.8%',
      target: '≥95%',
      status: 'go',
      progress: 96.8
    },
    {
      id: 'rag-citation',
      title: 'RAG Citation Hit-Rate',
      value: '92.1%',
      target: '≥90%',
      status: 'go',
      progress: 92.1
    },
    {
      id: 'audit-coverage',
      title: 'Audit Coverage',
      value: '100%',
      target: '100%',
      status: 'go',
      progress: 100
    },
    {
      id: 'policy-explain',
      title: 'Policy Block Explainability',
      value: '98.5%',
      target: '100%',
      status: 'go',
      progress: 98.5
    },
    {
      id: 'human-override',
      title: 'Human Override Rate',
      value: '12.4%',
      target: '≤10%',
      status: 'warning',
      progress: 124 // This is over 100% so we'll cap the visual at 100% but show the actual value
    }
  ];

  return (
    <div className="status-overview">
      {statusMetrics.map((metric) => (
        <div key={metric.id} className={`status-card ${metric.status}`}>
          <h3>{metric.title}</h3>
          <div className="metric">{metric.value}</div>
          <div className="target">Target: {metric.target}</div>
          <div className="progress-bar">
            <div 
              className={`progress-fill ${metric.status}`} 
              style={{ 
                width: `${Math.min(metric.progress, 100)}%`,
                maxWidth: '100%'
              }}
            ></div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default StatusCards;