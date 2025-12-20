import React from 'react';
import ReactFlow from 'react-flow-renderer';

/**
 * A dashboard component for visualizing "Fearsome Ops" plans using React Flow.
 *
 * @param props - The component props.
 * @param props.plan - The plan object containing shadow war simulations.
 * @returns The rendered FearsomeDashboard component.
 */
const FearsomeDashboard = ({ plan }) => (
  <div>
    <h1>Fearsome Ops</h1>
    <ReactFlow elements={plan?.shadowWarSims || []} />
  </div>
);

export default FearsomeDashboard;
