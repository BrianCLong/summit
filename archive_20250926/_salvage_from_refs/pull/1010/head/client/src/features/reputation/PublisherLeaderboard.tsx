import React from 'react';

export default function PublisherLeaderboard({ data }: { data: { publisher: string; score: number }[] }) {
  return (
    <ol>
      {data.map(d => (
        <li key={d.publisher}>
          {d.publisher} - {d.score.toFixed(2)}
        </li>
      ))}
    </ol>
  );
}
