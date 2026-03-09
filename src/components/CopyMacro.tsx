import React from 'react';
export default function CopyMacro({ slug }: { slug: string }) {
  const data = require('@site/docs/ops/support/macros.json');
  const m = data.find((x: any) => x.title.endsWith(slug));
  if (!m) return null;
  return (
    <button
      className="button button--sm"
      onClick={() => navigator.clipboard.writeText(m.body)}
    >
      Copy support macro
    </button>
  );
}
