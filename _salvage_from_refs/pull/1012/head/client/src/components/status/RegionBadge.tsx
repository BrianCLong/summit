import React from 'react';

type Props = { region: string };
export const RegionBadge: React.FC<Props> = ({ region }) => (
  <span className="region-badge">{region}</span>
);
