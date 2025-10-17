package telemetry

import (
	"context"
	"net/http"

	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/exporters/stdout/stdouttrace"
	"go.opentelemetry.io/otel/propagation"
	"go.opentelemetry.io/otel/sdk/resource"
	sdktrace "go.opentelemetry.io/otel/sdk/trace"
)

// InitProvider configures a basic stdout trace exporter for local development.
func InitProvider(serviceName string) (*sdktrace.TracerProvider, func(context.Context) error) {
	exporter, _ := stdouttrace.New(stdouttrace.WithPrettyPrint())
	provider := sdktrace.NewTracerProvider(
		sdktrace.WithBatcher(exporter),
		sdktrace.WithResource(resource.Empty()),
	)
	otel.SetTracerProvider(provider)
	otel.SetTextMapPropagator(propagation.TraceContext{})
	return provider, provider.Shutdown
}

// HTTPMiddleware wraps an http.Handler with OpenTelemetry instrumentation.
func HTTPMiddleware(next http.Handler, provider *sdktrace.TracerProvider) http.Handler {
	tracer := provider.Tracer("chronos/http")
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ctx, span := tracer.Start(r.Context(), r.URL.Path)
		defer span.End()
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}
