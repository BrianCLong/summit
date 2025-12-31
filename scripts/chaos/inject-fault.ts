
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const FAULTS = {
    LATENCY: 'latency',
    UNAVAILABLE: 'unavailable',
    CPU_SPIKE: 'cpu-spike'
};

const TARGETS = {
    POSTGRES: 'postgres',
    NEO4J: 'neo4j',
    API: 'api'
};

async function injectLatency(target: string, durationMs: number) {
    console.log(`💉 Injecting ${durationMs}ms latency into ${target}...`);
    // In real env: tc qdisc add dev eth0 root netem delay 100ms
    // Here: we just sleep/log as we don't have root or specific network access in this sandbox
    await new Promise(r => setTimeout(r, 1000));
    console.log(`✅ Latency injected (simulated)`);
}

async function makeUnavailable(target: string) {
    console.log(`💉 Making ${target} unavailable...`);
    // In real env: docker stop container
    console.log(`✅ ${target} stopped (simulated)`);
}

async function spikeCpu(durationSeconds: number) {
    console.log(`💉 Spiking CPU for ${durationSeconds}s...`);
    const end = Date.now() + durationSeconds * 1000;
    while (Date.now() < end) {
        Math.random() * Math.random();
    }
    console.log(`✅ CPU spike complete`);
}

async function main() {
    const fault = process.argv[2];
    const target = process.argv[3];
    const duration = parseInt(process.argv[4] || '5000'); // ms

    if (!fault) {
        console.error(`Usage: ts-node scripts/chaos/inject-fault.ts <fault> <target> [duration]`);
        console.error(`Faults: ${Object.values(FAULTS).join(', ')}`);
        console.error(`Targets: ${Object.values(TARGETS).join(', ')}`);
        process.exit(1);
    }

    console.log(`😈 CHAOS INJECTOR STARTED`);

    try {
        switch (fault) {
            case FAULTS.LATENCY:
                await injectLatency(target, duration);
                break;
            case FAULTS.UNAVAILABLE:
                await makeUnavailable(target);
                break;
            case FAULTS.CPU_SPIKE:
                await spikeCpu(duration / 1000);
                break;
            default:
                console.error(`Unknown fault: ${fault}`);
                process.exit(1);
        }
    } catch (error) {
        console.error('❌ Chaos injection failed:', error);
        process.exit(1);
    }
}

main();
