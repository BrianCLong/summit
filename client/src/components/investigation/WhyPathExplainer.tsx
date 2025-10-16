import React from 'react';
import ExplainabilityPanel from '../../ui/components/ExplainabilityPanel';
import type { WhyPath } from '../../ui/graph/overlays/WhyPathsOverlay';

interface Props {
  paths: WhyPath[];
}

const WhyPathExplainer: React.FC<Props> = ({ paths }) => (
  <ExplainabilityPanel paths={paths} />
);

export default WhyPathExplainer;
