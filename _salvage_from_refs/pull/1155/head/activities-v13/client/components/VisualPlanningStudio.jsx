import ReactFlow from 'react-flow-renderer';
import { useState } from 'react';
import 'tailwindcss/tailwind.css';
import * as THREE from 'three';

const VisualPlanningStudio = ({ plan }) => {
  const [nodes, setNodes] = useState([
    { id: '1', type: 'input', data: { label: 'Strategic Initiative' }, position: { x: 0, y: 0 } },
    { id: '2', data: { label: 'Engagement Campaign' }, position: { x: 150, y: 150 } },
    { id: '3', data: { label: 'Data Sync' }, position: { x: 300, y: 300 } },
    { id: 'e1-2', source: '1', target: '2', animated: true },
    { id: 'e2-3', source: '2', target: '3', animated: true },
  ]);

  return (
    <div className="h-screen bg-gray-900 text-white">
      <h1 className="text-4xl">v13 Planning Studio</h1>
      <ReactFlow elements={nodes} />
      <div className="p-6">
        <input type="range" min="0" max="1" step="0.001" defaultValue="0.001" className="w-full" />
        <p>Risk Profile: {plan.riskMitigator.mitigation}%</p>
        <p>Compliance: {plan.integrityAssurance.assurance}</p>
      </div>
    </div>
  );
};

export default VisualPlanningStudio;