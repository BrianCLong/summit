import React from 'react';

const events = [
  'Agent scout-7 flagged an anomaly on transfer chain.',
  'Timeline merged 12 OSINT events from trusted feeds.',
  'Analyst updated hypothesis: sanctions evasion cluster.',
];

export function ActivityStream() {
  return (
    <section>
      <h4>Activity Feed</h4>
      <ul>
        {events.map((event) => (
          <li key={event}>{event}</li>
        ))}
      </ul>
    </section>
  );
}
