import React, { useEffect, useState } from 'react';

export default function ErrorBudgetBurn({ pipeline }: { pipeline: string }) {
  const [burn, setBurn] = useState<{ fast: number; slow: number } | null>(null);
  useEffect(() => {
    const fast = Math.max(0.5, Math.random() * 1.6);
    const slow = Math.max(0.3, Math.random() * 1.2);
    setBurn({ fast, slow });
  }, [pipeline]);
  const badge = (x: number) =>
    x >= 2 ? 'bg-red-600' : x >= 1 ? 'bg-amber-500' : 'bg-emerald-600';
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      <Card
        title="Fast burn (1h)"
        value={`${burn?.fast?.toFixed(2) ?? '—'}x`}
        cls={badge(burn?.fast || 0)}
      />
      <Card
        title="Slow burn (6h)"
        value={`${burn?.slow?.toFixed(2) ?? '—'}x`}
        cls={badge(burn?.slow || 0)}
      />
    </div>
  );
}

function Card({
  title,
  value,
  cls,
}: {
  title: string;
  value: string;
  cls: string;
}) {
  return (
    <div className="rounded-2xl border p-4">
      <div className="mb-1 text-sm text-gray-500">{title}</div>
      <div className="text-2xl font-semibold">{value}</div>
      <span
        className={`mt-2 inline-block rounded px-2 py-0.5 text-xs text-white ${cls}`}
        aria-live="polite"
      >
        {cls.includes('emerald')
          ? 'HEALTHY'
          : cls.includes('amber')
            ? 'ALERT'
            : 'PAGE'}
      </span>
    </div>
  );
}
