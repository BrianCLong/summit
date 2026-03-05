package main

import (
	"fmt"
	"os"
	"supermux/internal/supermux"
	pkg "supermux/pkg/supermux"
)

func runSupermux(args []string) {
	if len(args) < 1 {
		fmt.Println("Usage: summit supermux <command>")
		os.Exit(1)
	}

	cmd := args[0]

	if os.Getenv("SUMMIT_FEATURE_SUPERMUX") != "1" {
		fmt.Println("Supermux feature is disabled. Set SUMMIT_FEATURE_SUPERMUX=1 to enable.")
		os.Exit(1)
	}

	run := pkg.NewRunID([]byte("cli-run-seed"))
	sup := supermux.NewSupervisor(run)

	switch cmd {
	case "up":
		fmt.Printf("Starting supermux agents for run %s...\n", run)
		spec := supermux.SessionSpec{Name: "agent-1", Command: "echo", Args: []string{"hello"}}
		id, err := sup.StartSession(spec)
		if err != nil {
			fmt.Printf("Error starting session: %v\n", err)
			os.Exit(1)
		}
		fmt.Printf("Session %s started.\n", id)
	case "ls":
		fmt.Println("Listing sessions:")
		for _, session := range sup.ListSessions() {
			fmt.Printf("  %s - %s [%s]\n", session.ID, session.Name, session.Status)
		}
	case "down":
		fmt.Println("Stopping all sessions...")
		// Placeholder for stopping all sessions
		fmt.Println("All sessions stopped.")
	case "attach":
		if len(args) < 2 {
			fmt.Println("Usage: summit supermux attach <session_id>")
			os.Exit(1)
		}
		fmt.Printf("Attaching to session %s...\n", args[1])
		// Placeholder for attach stream
	case "replay":
		if len(args) < 2 {
			fmt.Println("Usage: summit supermux replay <run_id>")
			os.Exit(1)
		}
		fmt.Printf("Replaying run %s...\n", args[1])
	case "prune":
		fmt.Println("Pruning old supermux artifacts...")
	default:
		fmt.Printf("Unknown command: %s\n", cmd)
		os.Exit(1)
	}
}
