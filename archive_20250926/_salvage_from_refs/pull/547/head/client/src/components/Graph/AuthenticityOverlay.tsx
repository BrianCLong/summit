import React from 'react';

interface Props {
  score?: number;
  band?: string;
  quarantined?: boolean;
}

const AuthenticityOverlay: React.FC<Props> = ({ score, band, quarantined }) => {
  if (quarantined) {
    return <span className="badge bg-warning" title="Quarantined">Quarantined</span>;
  }
  if (band) {
    return (
      <span className="badge" title={`Score: ${score ?? 0}`}>{band}</span>
    );
  }
  return null;
};

export default AuthenticityOverlay;
