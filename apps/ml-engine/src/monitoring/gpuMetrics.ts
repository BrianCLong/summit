import { Gauge, Registry } from 'prom-client';
import { promisify } from 'util';
import { execFile } from 'child_process';

import { config } from '../config';
import { logger } from '../utils/logger';

const execFileAsync = promisify(execFile);

const GPU_QUERY = [
  '--query-gpu=index,name,memory.total,memory.used,utilization.gpu,temperature.gpu',
  '--format=csv,noheader,nounits',
];

const DEFAULT_POLL_INTERVAL_MS = Number(process.env.GPU_POLL_INTERVAL_MS || 15000);

interface ParsedGpuMetrics {
  index: string;
  name: string;
  memoryTotal: number;
  memoryUsed: number;
  utilisation: number;
  temperature: number;
}

let gpuUtilisationGauge: Gauge<string> | undefined;
let gpuMemoryGauge: Gauge<string> | undefined;
let gpuTemperatureGauge: Gauge<string> | undefined;
let gpuAvailabilityGauge: Gauge<string> | undefined;

const loggedMissingBinary = { value: false };

function parseLine(line: string): ParsedGpuMetrics | undefined {
  const [index, name, memoryTotal, memoryUsed, utilisation, temperature] = line
    .split(',')
    .map((item) => item.trim());

  if (!index || !name) {
    return undefined;
  }

  return {
    index,
    name,
    memoryTotal: Number(memoryTotal),
    memoryUsed: Number(memoryUsed),
    utilisation: Number(utilisation),
    temperature: Number(temperature),
  };
}

async function collect(): Promise<void> {
  try {
    const { stdout } = await execFileAsync('nvidia-smi', GPU_QUERY);
    const lines = stdout.trim().split('\n');

    if (!gpuAvailabilityGauge || !gpuUtilisationGauge || !gpuMemoryGauge || !gpuTemperatureGauge) {
      return;
    }

    gpuAvailabilityGauge.set({ component: 'nvidia-smi' }, 1);

    for (const line of lines) {
      const parsed = parseLine(line);
      if (!parsed) {
        continue;
      }

      const labels = { index: parsed.index, name: parsed.name };
      gpuUtilisationGauge.set(labels, parsed.utilisation);
      const memoryPercentage = parsed.memoryTotal > 0 ? (parsed.memoryUsed / parsed.memoryTotal) * 100 : 0;
      gpuMemoryGauge.set(labels, memoryPercentage);
      gpuTemperatureGauge.set(labels, parsed.temperature);
    }
  } catch (error) {
    if (!loggedMissingBinary.value) {
      logger.warn('Unable to collect GPU metrics via nvidia-smi: %s', (error as Error).message);
      loggedMissingBinary.value = true;
    }

    if (gpuAvailabilityGauge) {
      gpuAvailabilityGauge.set({ component: 'nvidia-smi' }, 0);
    }
  }
}

export async function setupGpuMetrics(register: Registry): Promise<void> {
  if (!gpuUtilisationGauge) {
    gpuUtilisationGauge = new Gauge({
      name: 'ml_engine_gpu_utilisation_percent',
      help: 'Realtime GPU utilisation as reported by nvidia-smi',
      labelNames: ['index', 'name'],
      registers: [register],
    });

    gpuMemoryGauge = new Gauge({
      name: 'ml_engine_gpu_memory_utilisation_percent',
      help: 'GPU memory usage percentage derived from nvidia-smi',
      labelNames: ['index', 'name'],
      registers: [register],
    });

    gpuTemperatureGauge = new Gauge({
      name: 'ml_engine_gpu_temperature_celsius',
      help: 'Reported GPU temperature in Celsius',
      labelNames: ['index', 'name'],
      registers: [register],
    });

    gpuAvailabilityGauge = new Gauge({
      name: 'ml_engine_gpu_telemetry_available',
      help: 'Binary flag indicating whether GPU telemetry could be collected',
      labelNames: ['component'],
      registers: [register],
    });
  }

  const pollInterval = config.monitoring.gpuPollIntervalMs || DEFAULT_POLL_INTERVAL_MS;
  await collect();
  setInterval(collect, pollInterval).unref();
}
