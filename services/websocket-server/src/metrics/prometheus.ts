import client from 'prom-client';

// Create a Registry which registers the metrics
const register = new client.Registry();

// Add a default label which is added to all metrics
client.collectDefaultMetrics({ register });

export const messagePersisted = new client.Counter({
    name: 'websocket_message_persisted_total',
    help: 'Total number of persisted messages',
    labelNames: ['tenant', 'room']
});

export const connections = new client.Gauge({
    name: 'websocket_connections_total',
    help: 'Total number of active connections',
    labelNames: ['tenant']
});

export const connectedClients = new client.Gauge({
    name: 'websocket_connected_clients_total',
    help: 'Total number of connected clients',
    labelNames: ['tenant']
});

export const connectionErrors = new client.Counter({
    name: 'websocket_connection_errors_total',
    help: 'Total number of connection errors',
    labelNames: ['reason']
});

export { register };
