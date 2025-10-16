import React, { useEffect, useState } from 'react';
export default function Variant({
  a,
  b,
  id,
}: {
  a: React.ReactNode;
  b: React.ReactNode;
  id: string;
}) {
  const [v, setV] = useState<'a' | 'b'>('a');
  useEffect(() => {
    const key = `exp:${id}`;
    const cur =
      (localStorage.getItem(key) as 'a' | 'b' | null) ||
      (Math.random() < 0.5 ? 'a' : 'b');
    localStorage.setItem(key, cur);
    setV(cur);
  }, [id]);
  return <>{v === 'a' ? a : b}</>;
}
