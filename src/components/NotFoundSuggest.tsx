import React, { useEffect, useState } from 'react';
export default function NotFoundSuggest() {
  const [best, setBest] = useState<string | null>(null);
  useEffect(() => {
    import('@site/docs/ops/meta/redirects.json').then((m) => {
      const path = location.pathname;
      const cand = m.default.find((r: any) => r.from === path);
      setBest(cand?.to || null);
    });
  }, []);
  return best ? (
    <p>
      Were you looking for <a href={best}>{best}</a>?
    </p>
  ) : null;
}
