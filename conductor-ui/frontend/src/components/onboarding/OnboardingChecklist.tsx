// conductor-ui/frontend/src/components/onboarding/OnboardingChecklist.tsx
import React, { useState } from 'react';

const checklistItems = [
  { id: 'connect-source', text: 'Connect your first data source' },
  { id: 'run-pipeline', text: 'Run a pipeline' },
  { id: 'view-slos', text: 'View SLO dashboard' },
  { id: 'export-evidence', text: 'Export an evidence bundle' },
];

export const OnboardingChecklist = () => {
  const [completed, setCompleted] = useState<string[]>([]);

  const handleToggle = (id: string) => {
    setCompleted((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  return (
    <div>
      <h2>Getting Started</h2>
      <ul>
        {checklistItems.map((item) => (
          <li key={item.id}>
            <label>
              <input
                type="checkbox"
                checked={completed.includes(item.id)}
                onChange={() => handleToggle(item.id)}
              />
              {item.text}
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
};
