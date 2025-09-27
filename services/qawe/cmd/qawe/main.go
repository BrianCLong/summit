package main

import (
	"crypto/ed25519"
	"crypto/rand"
	"encoding/base64"
	"flag"
	"fmt"
	"log"
	"net/http"
	"os"

	"qawe/internal/engine"
	"qawe/internal/server"
)

func main() {
	addr := flag.String("addr", ":8080", "listen address")
	flag.Parse()

	priv, pub, err := loadServerKey()
	if err != nil {
		log.Fatalf("load signing key: %v", err)
	}

	eng := engine.NewEngine(nil, priv, pub)
	api := server.New(eng, pub)
	log.Printf("QAWE listening on %s (server public key %s)", *addr, base64.StdEncoding.EncodeToString(pub))
	if err := http.ListenAndServe(*addr, api.Handler()); err != nil {
		log.Fatalf("server error: %v", err)
	}
}

func loadServerKey() (ed25519.PrivateKey, ed25519.PublicKey, error) {
	encoded := os.Getenv("QAWE_SERVER_PRIVATE_KEY")
	if encoded == "" {
		pub, priv, err := ed25519.GenerateKey(rand.Reader)
		if err != nil {
			return nil, nil, err
		}
		return priv, pub, nil
	}
	data, err := base64.StdEncoding.DecodeString(encoded)
	if err != nil {
		return nil, nil, fmt.Errorf("decode private key: %w", err)
	}
	if len(data) != ed25519.PrivateKeySize {
		return nil, nil, fmt.Errorf("invalid private key length %d", len(data))
	}
	priv := ed25519.PrivateKey(data)
	pub := priv.Public().(ed25519.PublicKey)
	return priv, pub, nil
}
