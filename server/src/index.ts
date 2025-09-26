/**
 * IntelGraph Server Bootstrap
 *
 * Entry point with OpenTelemetry initialization
 */

// CRITICAL: Start OTEL before any other imports
import http from 'http';
import { startOtel, validateOtelConfig } from './otel';
import { initRealtime } from './realtime/collab.js';

async function bootstrap() {
  try {
    // Initialize OpenTelemetry first
    console.log('🚀 Starting IntelGraph Server...');

    // Validate OTEL configuration
    validateOtelConfig();

    // Start OpenTelemetry instrumentation
    await startOtel();

    // Now import and start the application
    // (This ensures OTEL captures all imports and initialization)
    const { createApp } = await import('./app');
    const app = await createApp();

    const port = Number(process.env.PORT || 4000);
    const httpServer = http.createServer(app);

    await initRealtime(httpServer);

    httpServer.listen(port, () => {
      console.log(`✅ IntelGraph Server running on port ${port}`);
      console.log(`🔍 Tracing enabled: ${process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'localhost'}`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start the application
bootstrap();
