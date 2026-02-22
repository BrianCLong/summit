FROM golang:1.22 as build
WORKDIR /src
COPY . .
RUN go build -o /out/wasm-runner ./main.go
FROM gcr.io/distroless/base
COPY --from=build /out/wasm-runner /usr/local/bin/wasm-runner
ENTRYPOINT ["/usr/local/bin/wasm-runner"]
