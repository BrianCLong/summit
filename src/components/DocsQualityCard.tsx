import React from 'react';
export default function DocsQualityCard(){
  const data = require('@site/docs/ops/quality/scores.json');
  if (!data?.length) return null;
  const low = data.filter((d:any)=> d.score < 70).slice(0,5);
  return (
    <div className="card padding--md">
      <strong>Docs Quality</strong>
      <p>{low.length} pages under target (<70). Top fixes:</p>
      <ul>
        {low.map((d:any)=> <li key={d.path}><a href={`/${d.path.replace(/\.mdx?$/,'')}`}>{d.path}</a> — {d.score}</li>)}
      </ul>
    </div>
  );
}