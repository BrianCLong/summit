#!/usr/bin/env node

import pkg from 'pg';
import { v4 as uuidv4 } from 'uuid';

const { Pool } = pkg;
const DATABASE_URL =
  process.env.DATABASE_URL ||
  'postgresql://maestro:maestro-dev-secret@localhost:5432/maestro';

const pool = new Pool({ connectionString: DATABASE_URL });

async function seedData() {
  console.log('Seeding database with sample data...');

  try {
    // Create sample pipelines
    const pipelineIds = [];
    const pipelines = [
      {
        name: 'Build IntelGraph',
        spec: { nodes: [{ type: 'build', cmd: 'npm run build' }] },
      },
      {
        name: 'Run Tests',
        spec: { nodes: [{ type: 'test', cmd: 'npm test' }] },
      },
      {
        name: 'Deploy Production',
        spec: { nodes: [{ type: 'deploy', env: 'production' }] },
      },
    ];

    for (const pipeline of pipelines) {
      const id = uuidv4();
      pipelineIds.push({ id, name: pipeline.name });

      await pool.query(
        'INSERT INTO pipelines (id, name, spec) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
        [id, pipeline.name, JSON.stringify(pipeline.spec)],
      );
      console.log(`Created pipeline: ${pipeline.name}`);
    }

    // Create sample runs for each pipeline
    const statuses = ['succeeded', 'running', 'failed', 'queued'];
    const runCount = 15;

    for (let i = 0; i < runCount; i++) {
      const pipeline = pipelineIds[i % pipelineIds.length];
      const status = statuses[i % statuses.length];
      const startTime = new Date(
        Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000,
      ); // Random time in last week
      const durationMs =
        status === 'succeeded' || status === 'failed'
          ? Math.floor(Math.random() * 300000) + 10000 // 10s to 5min
          : null;
      const completedAt = durationMs
        ? new Date(startTime.getTime() + durationMs)
        : null;
      const cost = Number((Math.random() * 5).toFixed(2));

      const runId = uuidv4();
      await pool.query(
        `
        INSERT INTO runs (id, pipeline_id, pipeline_name, status, started_at, completed_at, duration_ms, cost, input_params)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT DO NOTHING
      `,
        [
          runId,
          pipeline.id,
          pipeline.name,
          status,
          startTime,
          completedAt,
          durationMs,
          cost,
          JSON.stringify({ branch: 'main', commit: `abc${i}def` }),
        ],
      );
    }

    console.log(`Created ${runCount} sample runs`);

    // Create sample executors
    const executors = [
      {
        name: 'cpu-executor-1',
        kind: 'cpu',
        labels: ['linux', 'x64'],
        capacity: 4,
      },
      {
        name: 'gpu-executor-1',
        kind: 'gpu',
        labels: ['cuda', 'ml'],
        capacity: 1,
      },
      {
        name: 'cpu-executor-2',
        kind: 'cpu',
        labels: ['linux', 'arm64'],
        capacity: 2,
      },
    ];

    for (const executor of executors) {
      await pool.query(
        `
        INSERT INTO executors (name, kind, labels, capacity, status)
        VALUES ($1, $2, $3, $4, 'ready')
        ON CONFLICT (name) DO NOTHING
      `,
        [executor.name, executor.kind, executor.labels, executor.capacity],
      );
      console.log(`Created executor: ${executor.name}`);
    }

    console.log('Database seeding completed successfully!');
  } catch (error) {
    console.error('Error seeding database:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

seedData().catch((error) => {
  console.error(error);
  process.exit(1);
});
