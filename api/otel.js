const { NodeSDK } = require('@opentelemetry/sdk-node');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
const sdk = new NodeSDK({ instrumentations: [getNodeAutoInstrumentations()] });
sdk.start();
process.on('SIGTERM', () => sdk.shutdown().finally(()=>process.exit(0)));