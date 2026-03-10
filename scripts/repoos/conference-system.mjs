#!/usr/bin/env node

import fs from 'fs/promises';

const registryPath = '.repoos/events/conference-registry.json';
const sessionsPath = '.repoos/events/sessions.json';
const speakersPath = '.repoos/events/speakers.json';
const metricsPath = '.repoos/events/event-metrics.json';
const reportPath = '.repoos/evidence/conference-system-report.json';

async function readJson(path) {
  const content = await fs.readFile(path, 'utf8');
  return JSON.parse(content);
}

async function writeJson(path, data) {
  await fs.writeFile(path, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

async function listEvents() {
  const registry = await readJson(registryPath);
  const events = [...registry.events].sort((a, b) => a.date.localeCompare(b.date));

  if (events.length === 0) {
    console.log('No conferences registered.');
    return;
  }

  for (const event of events) {
    console.log(`${event.date} | ${event.event_name} | ${event.location}`);
  }
}

function getFlag(name) {
  const arg = process.argv.find(value => value.startsWith(`${name}=`));
  return arg ? arg.slice(name.length + 1) : '';
}

async function registerEvent() {
  const eventName = getFlag('--event_name');
  const location = getFlag('--location');
  const date = getFlag('--date');
  const partnersRaw = getFlag('--participating_partners');

  if (!eventName || !location || !date || !partnersRaw) {
    console.error(
      'Usage: conference register-event --event_name="..." --location="..." --date="YYYY-MM-DD" --participating_partners="Partner A,Partner B"'
    );
    process.exit(1);
  }

  const partners = partnersRaw
    .split(',')
    .map(partner => partner.trim())
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));

  const registry = await readJson(registryPath);
  const withoutDuplicate = registry.events.filter(entry => entry.event_name !== eventName);
  withoutDuplicate.push({
    event_name: eventName,
    location,
    date,
    participating_partners: partners,
  });

  withoutDuplicate.sort((a, b) => {
    const dateDiff = a.date.localeCompare(b.date);
    return dateDiff === 0 ? a.event_name.localeCompare(b.event_name) : dateDiff;
  });

  await writeJson(registryPath, { events: withoutDuplicate });
  await buildEvidenceReport();
  console.log(`Registered conference event: ${eventName}`);
}

async function showSessions() {
  const sessions = await readJson(sessionsPath);
  for (const session of sessions.sessions) {
    console.log(`${session.session_title} | ${session.speaker} | ${session.topic}`);
    console.log(`  Demo: ${session.plugin_or_integration_demonstrated}`);
  }
}

async function buildEvidenceReport() {
  const [registry, sessions, speakers, metrics] = await Promise.all([
    readJson(registryPath),
    readJson(sessionsPath),
    readJson(speakersPath),
    readJson(metricsPath),
  ]);

  const totalAttendees = metrics.metrics.reduce((sum, item) => sum + item.attendees, 0);
  const totalSignups = metrics.metrics.reduce((sum, item) => sum + item.developer_signups, 0);
  const totalPluginInstalls = metrics.metrics.reduce(
    (sum, item) => sum + item.plugin_installs_during_event,
    0
  );

  const report = {
    summary: {
      total_events: registry.events.length,
      total_sessions: sessions.sessions.length,
      total_speakers: speakers.speakers.length,
      total_attendees: totalAttendees,
      total_developer_signups: totalSignups,
      total_plugin_installs_during_events: totalPluginInstalls,
    },
    events: [...registry.events].sort((a, b) => a.date.localeCompare(b.date)),
    generated_by: 'scripts/repoos/conference-system.mjs',
    deterministic: true,
  };

  await writeJson(reportPath, report);
}


async function validateSchemas() {
  const checks = [
    {
      path: registryPath,
      root: 'events',
      fields: ['event_name', 'location', 'date', 'participating_partners'],
    },
    {
      path: sessionsPath,
      root: 'sessions',
      fields: ['session_title', 'speaker', 'topic', 'plugin_or_integration_demonstrated'],
    },
    {
      path: speakersPath,
      root: 'speakers',
      fields: ['developer_id', 'organization', 'sessions_presented'],
    },
    {
      path: metricsPath,
      root: 'metrics',
      fields: ['event_name', 'attendees', 'developer_signups', 'plugin_installs_during_event'],
    },
  ];

  for (const check of checks) {
    const payload = await readJson(check.path);
    const rows = payload[check.root];
    if (!Array.isArray(rows)) {
      throw new Error(`${check.path} must contain array at ${check.root}`);
    }

    for (const row of rows) {
      for (const field of check.fields) {
        if (!(field in row)) {
          throw new Error(`${check.path} missing field ${field}`);
        }
      }
    }
  }
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] === 'conference' ? args[1] : args[0];

  switch (command) {
    case 'list':
      await listEvents();
      break;
    case 'register-event':
      await registerEvent();
      break;
    case 'show-sessions':
      await showSessions();
      break;
    case 'validate-schema':
      await validateSchemas();
      console.log('Conference schema validation passed.');
      break;
    case 'build-report':
      await validateSchemas();
      await buildEvidenceReport();
      console.log('Conference evidence report generated.');
      break;
    default:
      console.log('conference list');
      console.log('conference register-event --event_name="..." --location="..." --date="YYYY-MM-DD" --participating_partners="A,B"');
      console.log('conference show-sessions');
      console.log('conference validate-schema');
      console.log('conference build-report');
      process.exit(command ? 1 : 0);
  }
}

main().catch(error => {
  console.error('conference-system error:', error);
  process.exit(1);
});
