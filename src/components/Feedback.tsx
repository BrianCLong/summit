import React, { useState } from 'react';
export default function Feedback() {
  const [v, setV] = useState(null as null | 'up' | 'down');
  const url = (title: string) =>
    `https://github.com/intelgraph/intelgraph/issues/new?title=Docs%20feedback:%20${encodeURIComponent(title)}&labels=docs-feedback`;
  const t = (document?.title || 'Untitled').replace(' | IntelGraph Docs', '');
  if (v === 'down') {
    return (
      <a className="button" href={url(t)} target="_blank">
        Open a feedback issue
      </a>
    );
  }
  return (
    <div className="flex gap-2 items-center">
      <span>Was this helpful?</span>
      <button onClick={() => setV('up')} className="button button--sm">
        👍
      </button>
      <button onClick={() => setV('down')} className="button button--sm">
        👎
      </button>
    </div>
  );
}
