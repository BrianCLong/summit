package main

import (
	"flag"
	"fmt"
	"log"

	"github.com/summit/qset/internal/ledger"
)

func main() {
	var logPath string
	var publicKey string
	flag.StringVar(&logPath, "log", "qset.log", "Path to ledger log file")
	flag.StringVar(&publicKey, "public-key", "", "Base64 encoded ledger public key")
	flag.Parse()

	if publicKey == "" {
		log.Fatal("public key required")
	}
	key, err := ledger.DecodePublicKey(publicKey)
	if err != nil {
		log.Fatalf("invalid public key: %v", err)
	}
	if err := ledger.VerifyFile(logPath, key); err != nil {
		log.Fatalf("ledger verification failed: %v", err)
	}
	fmt.Println("ledger verified")
}
