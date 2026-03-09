import React, { useState, useEffect } from 'react';
export default function SdkPicker({
  sdks,
}: {
  sdks: { id: string; label: string }[];
}) {
  const [sdk, setSdk] = useState(localStorage.getItem('sdk') || sdks[0].id);
  useEffect(() => {
    localStorage.setItem('sdk', sdk);
  }, [sdk]);
  return (
    <div className="card padding--md">
      <strong>SDK:</strong>
      {sdks.map((s) => (
        <button
          key={s.id}
          className={`button button--sm margin-left--sm ${sdk === s.id ? 'button--primary' : ''}`}
          onClick={() => setSdk(s.id)}
        >
          {s.label}
        </button>
      ))}
    </div>
  );
}
