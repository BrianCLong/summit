FROM golang:1.22 AS build
WORKDIR /src
COPY runtime/go.mod runtime/go.sum ./
RUN go mod download
COPY runtime ./runtime
WORKDIR /src/runtime
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o /out/chronosd ./cmd/chronosd

FROM gcr.io/distroless/base-debian12
WORKDIR /app
COPY --from=build /out/chronosd /app/chronosd
ENV PG_DSN=""
EXPOSE 8080
ENTRYPOINT ["/app/chronosd"]
