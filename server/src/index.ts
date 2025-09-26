/**
 * IntelGraph Server Bootstrap
 *
 * Entry point with OpenTelemetry initialization
 */

// CRITICAL: Start OTEL before any other imports
import { startOtel, validateOtelConfig } from './otel';

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
    const { app, httpServer, cleanup } = await createApp();

    const port = Number(process.env.PORT) || 4000;

    httpServer.listen(port, () => {
      console.log(`✅ IntelGraph Server running on port ${port}`);
      console.log(`🔍 Tracing enabled: ${process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'localhost'}`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    });

    const handleShutdown = async (signal: NodeJS.Signals) => {
      console.log(`Received ${signal}, shutting down gracefully...`);
      try {
        await cleanup();
      } catch (error) {
        console.error('Error during cleanup:', error);
      }
      process.exit(0);
    };

    process.on('SIGTERM', () => void handleShutdown('SIGTERM'));
    process.on('SIGINT', () => void handleShutdown('SIGINT'));

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
