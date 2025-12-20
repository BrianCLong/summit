# syntax=docker/dockerfile:1.6

# --- build stage: compile static binary ---
FROM golang:1.22-alpine AS build
WORKDIR /src

ENV CGO_ENABLED=0

COPY go.mod go.sum ./
RUN go mod download

COPY . .

ARG TARGET=./cmd/app
ARG OUTPUT=app
RUN go build -trimpath -ldflags "-s -w" -o /out/${OUTPUT} ${TARGET}

# --- runtime stage: distroless/static ---
FROM gcr.io/distroless/static:nonroot

ARG BUILD_SHA="unknown"
ARG BUILD_TIMESTAMP="unknown"
ARG SBOM_DIGEST=""

WORKDIR /app
COPY --from=build /out /app

USER 65532:65532
EXPOSE 8080

LABEL org.opencontainers.image.source="https://github.com/summit/intelgraph" \
      org.opencontainers.image.revision="$BUILD_SHA" \
      org.opencontainers.image.created="$BUILD_TIMESTAMP" \
      org.opencontainers.image.base.name="gcr.io/distroless/static:nonroot" \
      org.opencontainers.image.vendor="IntelGraph" \
      org.opencontainers.image.description="IntelGraph static runtime (distroless, non-root, read-only)" \
      org.opencontainers.image.sbom="$SBOM_DIGEST"

ENTRYPOINT ["/app/app"]
