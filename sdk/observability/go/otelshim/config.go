package otelshim

import (
	"context"
	"log"
	"os"
	"time"

	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/exporters/otlp/otlpmetric/otlpmetrichttp"
	"go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracehttp"
	metricsdk "go.opentelemetry.io/otel/sdk/metric"
	"go.opentelemetry.io/otel/sdk/resource"
	tracesdk "go.opentelemetry.io/otel/sdk/trace"
	semconv "go.opentelemetry.io/otel/semconv/v1.21.0"
)

// Config drives the one-line initialization for services adopting the Observability First SDK.
type Config struct {
	ServiceName         string
	ServiceNamespace    string
	Environment         string
	OTLPEndpoint        string
	InsecureTransport   bool
	TraceSampleRatio    float64
	PIIRedactionEnabled bool
}

// DefaultConfig returns sane defaults matching the Observability First SLO objectives.
func DefaultConfig(serviceName string) Config {
	return Config{
		ServiceName:         serviceName,
		ServiceNamespace:    "summit-portfolio",
		Environment:         envOrDefault("DEPLOY_ENV", "development"),
		OTLPEndpoint:        envOrDefault("OTLP_ENDPOINT", "otel-collector:4318"),
		InsecureTransport:   true,
		TraceSampleRatio:    0.05,
		PIIRedactionEnabled: true,
	}
}

// Init configures metrics, traces, and logging exporters with resource attributes and sampling.
func Init(ctx context.Context, cfg Config) (func(context.Context) error, error) {
	res, err := resource.New(
		resource.WithFromEnv(),
		resource.WithTelemetrySDK(),
		resource.WithHost(),
		resource.WithAttributes(
			semconv.ServiceName(cfg.ServiceName),
			semconv.ServiceNamespace(cfg.ServiceNamespace),
			semconv.DeploymentEnvironment(cfg.Environment),
		),
	)
	if err != nil {
		return nil, err
	}

	traceClientOpts := []otlptracehttp.Option{otlptracehttp.WithEndpoint(cfg.OTLPEndpoint)}
	if cfg.InsecureTransport {
		traceClientOpts = append(traceClientOpts, otlptracehttp.WithInsecure())
	}

	traceExporter, err := otlptracehttp.New(ctx, traceClientOpts...)
	if err != nil {
		return nil, err
	}

	traceProvider := tracesdk.NewTracerProvider(
		tracesdk.WithBatcher(traceExporter,
			tracesdk.WithMaxQueueSize(2048),
			tracesdk.WithBatchTimeout(5*time.Second),
		),
		tracesdk.WithSampler(tracesdk.ParentBased(tracesdk.TraceIDRatioBased(cfg.TraceSampleRatio))),
		tracesdk.WithResource(res),
	)

	metricClientOpts := []otlpmetrichttp.Option{otlpmetrichttp.WithEndpoint(cfg.OTLPEndpoint)}
	if cfg.InsecureTransport {
		metricClientOpts = append(metricClientOpts, otlpmetrichttp.WithInsecure())
	}

	metricExporter, err := otlpmetrichttp.New(ctx, metricClientOpts...)
	if err != nil {
		return nil, err
	}

	meterProvider := metricsdk.NewMeterProvider(
		metricsdk.WithReader(metricsdk.NewPeriodicReader(metricExporter,
			metricsdk.WithInterval(15*time.Second))),
		metricsdk.WithResource(res),
	)

	otel.SetTracerProvider(traceProvider)
	otel.SetMeterProvider(meterProvider)

	log.SetOutput(NewJSONLogger(os.Stdout, cfg))

	return func(ctx context.Context) error {
		if err := traceProvider.Shutdown(ctx); err != nil {
			return err
		}
		return meterProvider.Shutdown(ctx)
	}, nil
}
