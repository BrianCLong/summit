import ReactFlow from 'react-flow-renderer';
import { useState } from 'react';
import 'tailwindcss/tailwind.css';
import * as THREE from 'three';

const CollaborativePlanningHub = ({ plan }) => {
  const [nodes, setNodes] = useState([
    {
      id: '1',
      type: 'input',
      data: { label: 'Strategic Synergy' },
      position: { x: 0, y: 0 },
    },
    {
      id: '2',
      data: { label: 'Engagement Flow' },
      position: { x: 150, y: 150 },
    },
    {
      id: '3',
      data: { label: 'Data Alignment' },
      position: { x: 300, y: 300 },
    },
    {
      id: '4',
      data: { label: 'Telemetry Enhancer' },
      position: { x: 450, y: 450 },
    },
    {
      id: '5',
      data: { label: 'Vulnerability Swarm' },
      position: { x: 600, y: 600 },
    },
    {
      id: '6',
      data: { label: 'Stabilization Matrix' },
      position: { x: 750, y: 750 },
    },
    {
      id: '7',
      data: { label: 'Narrative Harmonizer' },
      position: { x: 900, y: 900 },
    },
    {
      id: '8',
      data: { label: 'Quantum Synergy Swarm' },
      position: { x: 1050, y: 1050 },
    },
    {
      id: '9',
      data: { label: 'Global Vortex' },
      position: { x: 1200, y: 1200 },
    },
    {
      id: '10',
      data: { label: 'Entangled Influence' },
      position: { x: 1350, y: 1350 },
    },
    { id: 'e1-2', source: '1', target: '2', animated: true },
    { id: 'e2-3', source: '2', target: '3', animated: true },
    { id: 'e3-4', source: '3', target: '4', animated: true },
    { id: 'e4-5', source: '4', target: '5', animated: true },
    { id: 'e5-6', source: '5', target: '6', animated: true },
    { id: 'e6-7', source: '6', target: '7', animated: true },
    { id: 'e7-8', source: '7', target: '8', animated: true },
    { id: 'e8-9', source: '8', target: '9', animated: true },
    { id: 'e9-10', source: '9', target: '10', animated: true },
  ]);

  return (
    <div className="h-screen bg-gray-900 text-white padding-4">
      <h1 className="text-7xl font-bold mb-4">
        v21 Harmonized Global Synergy Hub
      </h1>
      <ReactFlow elements={nodes} className="h-[800px] mb-4" />
      <div className="grid-cols-2 gap-4 mb-4">
        <div className="p-4 bg-gray-800 rounded-lg">
          <h2 className="text-4xl mb-2">Quantum Synergy Controls</h2>
          <div className="flex flex-col gap-2">
            <div>
              <label>Synergy Scale: </label>
              <input
                type="range"
                min="0"
                max="10000000000"
                defaultValue={plan.synergyScale}
              />
            </div>
            <div>
              <label>Vulnerability Precision: </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.0000001"
                defaultValue={plan.vulnerabilityPrecision}
              />
            </div>
            <div>
              <label>Influence Intensity: </label>
              <input
                type="range"
                min="0"
                max="1000000"
                defaultValue={plan.influenceIntensity}
              />
            </div>
            <div>
              <label>Stabilization Matrix: </label>
              <input
                type="range"
                min="0"
                max="100"
                defaultValue={plan.stabilizationMatrix}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CollaborativePlanningHub;
