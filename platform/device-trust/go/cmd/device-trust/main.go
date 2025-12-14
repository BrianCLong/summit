package main

import (
	"log"
	"os"

	"platform/device-trust/internal/server"
)

func main() {
	addr := ":8088"
	if env := os.Getenv("DEVICE_TRUST_ADDR"); env != "" {
		addr = env
	}
	log.Printf("booting device-trust posture engine on %s", addr)
	server.Listen(addr)
}
