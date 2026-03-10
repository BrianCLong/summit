import React from 'react'

type ConferenceEvent = {
  event_name: string
  location: string
  date: string
  participating_partners: string[]
}

const UPCOMING_CONFERENCES: ConferenceEvent[] = [
  {
    event_name: 'Summit Build Global 2026',
    location: 'San Francisco, USA',
    date: '2026-09-14',
    participating_partners: ['Anduril', 'Datadog', 'Neo4j', 'Snowflake'],
  },
  {
    event_name: 'Summit Partner Summit EMEA',
    location: 'Berlin, Germany',
    date: '2026-11-05',
    participating_partners: ['Grafana Labs', 'HashiCorp', 'Palantir', 'Red Hat'],
  },
  {
    event_name: 'Summit Plugin Accelerator APJ',
    location: 'Singapore',
    date: '2027-02-19',
    participating_partners: ['Cloudflare', 'Elastic', 'MongoDB', 'Snyk'],
  },
]

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  })
}

export default function DeveloperConferencePage() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Developer Portal: Global Conferences</h2>
        <p className="text-muted-foreground mt-2">
          Upcoming Summit ecosystem events for developers, partners, plugin creators, and enterprise users.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {UPCOMING_CONFERENCES.map(event => (
          <article key={event.event_name} className="rounded-lg border bg-card p-4 shadow-sm">
            <h3 className="text-lg font-medium">{event.event_name}</h3>
            <p className="text-sm text-muted-foreground mt-1">{event.location}</p>
            <p className="text-sm font-medium mt-2">{formatDate(event.date)}</p>

            <div className="mt-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Participating Partners</p>
              <ul className="mt-2 flex flex-wrap gap-2">
                {event.participating_partners.map(partner => (
                  <li key={partner} className="rounded-full border px-2 py-1 text-xs">
                    {partner}
                  </li>
                ))}
              </ul>
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}
