import React, { useState } from 'react';

const CopilotSidebar = () => {
  const [prompt, setPrompt] = useState('');
  const [plan, setPlan] = useState<any>(null);

  const handlePlan = () => {
    setPlan({ explain: { prompt }, readOnly: true });
  };

  return (
    <aside>
      <textarea value={prompt} onChange={e => setPrompt(e.target.value)} />
      <button onClick={handlePlan}>Plan</button>
      {plan && <pre>{JSON.stringify(plan.explain, null, 2)}</pre>}
    </aside>
  );
};

export default CopilotSidebar;
