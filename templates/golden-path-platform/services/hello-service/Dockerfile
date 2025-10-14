# syntax=docker/dockerfile:1.7-labs
FROM --platform=$BUILDPLATFORM golang:1.22.4-alpine3.19 AS builder
WORKDIR /src
COPY go.mod go.sum* ./
RUN --mount=type=cache,target=/go/pkg/mod \
    --mount=type=cache,target=/root/.cache/go-build \
    go mod download
COPY . .
ARG TARGETOS
ARG TARGETARCH
ARG GIT_SHA
ARG BUILD_DATE
RUN --mount=type=cache,target=/go/pkg/mod \
    --mount=type=cache,target=/root/.cache/go-build \
    CGO_ENABLED=0 GOOS=$TARGETOS GOARCH=$TARGETARCH go build \
      -trimpath -ldflags "-s -w -X main.version=$GIT_SHA -X main.buildDate=$BUILD_DATE" \
      -o /out/hello-service

FROM gcr.io/distroless/static:nonroot
USER nonroot:nonroot
WORKDIR /
COPY --from=builder /out/hello-service /hello-service
EXPOSE 8080
ENTRYPOINT ["/hello-service"]
