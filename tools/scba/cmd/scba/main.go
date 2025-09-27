package main

import (
	"fmt"
	"os"
	"os/exec"
)

func main() {
	python := os.Getenv("SCBA_PYTHON")
	if python == "" {
		python = "python3"
	}
	args := append([]string{"-m", "tools.scba.cli"}, os.Args[1:]...)
	cmd := exec.Command(python, args...)
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	cmd.Stdin = os.Stdin
	if err := cmd.Run(); err != nil {
		fmt.Fprintf(os.Stderr, "scba: %v\n", err)
		if exitErr, ok := err.(*exec.ExitError); ok {
			os.Exit(exitErr.ExitCode())
		}
		os.Exit(1)
	}
}
