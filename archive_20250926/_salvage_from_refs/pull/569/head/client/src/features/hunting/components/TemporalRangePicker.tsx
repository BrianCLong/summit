import React from 'react';

export default function TemporalRangePicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return <input value={value} onChange={e => onChange(e.target.value)} placeholder="T-1h" />;
}
