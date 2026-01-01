import React from 'react';

const GoNoGoDecision = () => {
  // In a real application, this would be determined by business logic based on metrics
  const decisionStatus = 'warning'; // Based on current metrics showing some warnings
  const decisionText = 'Conditional Go';

  return (
    <div className="go-no-go-decision">
      <div className={`decision-badge ${decisionStatus}`}>
        {decisionText}
      </div>
      <p>
        GA Core ready pending ER precision improvements (87.3% → 90%) and
        hypothesis documentation cleanup
      </p>
    </div>
  );
};

export default GoNoGoDecision;