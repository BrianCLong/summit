package main

import (
	"encoding/base64"
	"log"
	"net"
	"os"
	"strings"

	"platform/cce/api"
	"platform/cce/internal/attestation"
	"platform/cce/internal/grpcstub"
	"platform/cce/internal/manager"
	"platform/cce/internal/storage"
)

func main() {
	sealKey := os.Getenv("CCE_SEAL_KEY")
	if sealKey == "" {
		sealKey = "dGVzdC1zZWVkLWtleS0xMjM0NTY3ODkwMTIzNDU2Nzg5MDEyMw=="
	}
	rawKey, err := base64.StdEncoding.DecodeString(sealKey)
	if err != nil {
		log.Fatalf("invalid seal key: %v", err)
	}
	store, err := storage.NewSealedStorage(rawKey)
	if err != nil {
		log.Fatalf("seal storage: %v", err)
	}

	allowedRegions := []string{"us-east-1", "us-west-2"}
	if env := os.Getenv("CCE_ALLOWED_REGIONS"); env != "" {
		allowedRegions = strings.Split(env, ",")
	}

	verifier := attestation.NewVerifier(
		"f1c8c55d3c9d5b57a3678c3a60afcd72bafc2c24d0c9b5580d1a6d1f44b68859",
		allowedRegions,
		[]attestation.Quote{
			{ID: "test-quote-1", Region: "us-east-1", Measurement: "f1c8c55d3c9d5b57a3678c3a60afcd72bafc2c24d0c9b5580d1a6d1f44b68859"},
			{ID: "test-quote-2", Region: "us-west-2", Measurement: "f1c8c55d3c9d5b57a3678c3a60afcd72bafc2c24d0c9b5580d1a6d1f44b68859"},
		},
	)

	mgr, err := manager.NewEnclaveManager(verifier, store, "kms:local-wrap", allowedRegions[0])
	if err != nil {
		log.Fatalf("manager init: %v", err)
	}

	server := grpcstub.NewServer()
	api.RegisterComputeEnclaveServer(server, mgr)

	addr := os.Getenv("CCE_BIND_ADDR")
	if addr == "" {
		addr = ":8443"
	}
	listener, err := net.Listen("tcp", addr)
	if err != nil {
		log.Fatalf("listen %s: %v", addr, err)
	}
	log.Printf("CCE gRPC-style server listening on %s", addr)
	if err := server.Serve(listener); err != nil {
		log.Fatalf("server error: %v", err)
	}
}
