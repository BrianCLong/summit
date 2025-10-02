package main

import (
	"bytes"
	"context"
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/summit/jitae/internal/audit"
)

func main() {
	ctx := context.Background()
	fs := flag.NewFlagSet("jitae-cli", flag.ExitOnError)
	host := fs.String("host", "http://localhost:8080", "JITAE service base URL")
	_ = fs.Parse(os.Args[1:])

	args := fs.Args()
	if len(args) == 0 {
		usage()
		os.Exit(1)
	}

	client := &http.Client{Timeout: 10 * time.Second}

	switch args[0] {
	case "templates":
		handleTemplates(ctx, client, *host, args[1:])
	case "requests":
		handleRequests(ctx, client, *host, args[1:])
	case "audit":
		handleAudit(ctx, client, *host, args[1:])
	default:
		fmt.Fprintf(os.Stderr, "unknown command %q\n", args[0])
		usage()
		os.Exit(1)
	}
}

func handleTemplates(ctx context.Context, client *http.Client, host string, args []string) {
	if len(args) == 0 {
		fmt.Fprintln(os.Stderr, "usage: jitae-cli templates [list|create]")
		os.Exit(1)
	}
	switch args[0] {
	case "list":
		resp := mustRequest(ctx, client, http.MethodGet, host+"/templates", nil)
		defer resp.Body.Close()
		io.Copy(os.Stdout, resp.Body)
	case "create":
		createFS := flag.NewFlagSet("templates create", flag.ExitOnError)
		name := createFS.String("name", "", "template name")
		description := createFS.String("description", "", "template description")
		scopes := createFS.String("scopes", "", "comma separated scope list")
		ttl := createFS.String("ttl", "1h", "grant duration (Go duration, e.g. 15m)")
		_ = createFS.Parse(args[1:])
		ttlDur, err := time.ParseDuration(*ttl)
		if err != nil {
			fmt.Fprintf(os.Stderr, "invalid ttl: %v\n", err)
			os.Exit(1)
		}
		payload := map[string]any{
			"name":        *name,
			"description": *description,
			"scopes":      splitCSV(*scopes),
			"ttlSeconds":  int64(ttlDur.Seconds()),
		}
		body, _ := json.Marshal(payload)
		resp := mustRequest(ctx, client, http.MethodPost, host+"/templates", bytes.NewReader(body))
		defer resp.Body.Close()
		io.Copy(os.Stdout, resp.Body)
	default:
		fmt.Fprintf(os.Stderr, "unknown templates subcommand %q\n", args[0])
		os.Exit(1)
	}
}

func handleRequests(ctx context.Context, client *http.Client, host string, args []string) {
	if len(args) == 0 {
		fmt.Fprintln(os.Stderr, "usage: jitae-cli requests [list|create|approve]")
		os.Exit(1)
	}
	switch args[0] {
	case "list":
		resp := mustRequest(ctx, client, http.MethodGet, host+"/requests", nil)
		defer resp.Body.Close()
		io.Copy(os.Stdout, resp.Body)
	case "create":
		createFS := flag.NewFlagSet("requests create", flag.ExitOnError)
		templateID := createFS.String("template", "", "template identifier")
		requestor := createFS.String("requestor", "", "requestor id")
		purpose := createFS.String("purpose", "", "purpose binding text")
		_ = createFS.Parse(args[1:])
		payload := map[string]any{
			"templateId":  *templateID,
			"requestorId": *requestor,
			"purpose":     *purpose,
		}
		body, _ := json.Marshal(payload)
		resp := mustRequest(ctx, client, http.MethodPost, host+"/requests", bytes.NewReader(body))
		defer resp.Body.Close()
		io.Copy(os.Stdout, resp.Body)
	case "approve":
		approveFS := flag.NewFlagSet("requests approve", flag.ExitOnError)
		id := approveFS.String("id", "", "request identifier")
		approver := approveFS.String("approver", "", "approver id")
		comment := approveFS.String("comment", "", "approval note")
		_ = approveFS.Parse(args[1:])
		payload := map[string]any{
			"approverId": *approver,
			"comment":    *comment,
		}
		body, _ := json.Marshal(payload)
		resp := mustRequest(ctx, client, http.MethodPost, host+"/requests/"+*id+"/approve", bytes.NewReader(body))
		defer resp.Body.Close()
		io.Copy(os.Stdout, resp.Body)
	default:
		fmt.Fprintf(os.Stderr, "unknown requests subcommand %q\n", args[0])
		os.Exit(1)
	}
}

func handleAudit(ctx context.Context, client *http.Client, host string, args []string) {
	if len(args) == 0 {
		fmt.Fprintln(os.Stderr, "usage: jitae-cli audit [list|verify]")
		os.Exit(1)
	}
	switch args[0] {
	case "list":
		resp := mustRequest(ctx, client, http.MethodGet, host+"/audit/events", nil)
		defer resp.Body.Close()
		io.Copy(os.Stdout, resp.Body)
	case "verify":
		eventsResp := mustRequest(ctx, client, http.MethodGet, host+"/audit/events", nil)
		defer eventsResp.Body.Close()
		var events []audit.Event
		if err := json.NewDecoder(eventsResp.Body).Decode(&events); err != nil {
			fmt.Fprintf(os.Stderr, "failed to decode events: %v\n", err)
			os.Exit(1)
		}
		keyResp := mustRequest(ctx, client, http.MethodGet, host+"/audit/public-key", nil)
		defer keyResp.Body.Close()
		var keyPayload struct {
			PublicKey string `json:"publicKey"`
		}
		if err := json.NewDecoder(keyResp.Body).Decode(&keyPayload); err != nil {
			fmt.Fprintf(os.Stderr, "failed to decode public key: %v\n", err)
			os.Exit(1)
		}
		allValid := true
		for _, evt := range events {
			ok, err := audit.VerifyWithPublicKey(keyPayload.PublicKey, evt)
			if err != nil || !ok {
				fmt.Printf("event %s failed verification: %v\n", evt.ID, err)
				allValid = false
			} else {
				fmt.Printf("event %s signature verified\n", evt.ID)
			}
		}
		if !allValid {
			os.Exit(1)
		}
	default:
		fmt.Fprintf(os.Stderr, "unknown audit subcommand %q\n", args[0])
		os.Exit(1)
	}
}

func splitCSV(in string) []string {
	if in == "" {
		return nil
	}
	parts := strings.Split(in, ",")
	out := make([]string, 0, len(parts))
	for _, part := range parts {
		trimmed := strings.TrimSpace(part)
		if trimmed != "" {
			out = append(out, trimmed)
		}
	}
	return out
}

func mustRequest(ctx context.Context, client *http.Client, method, url string, body io.Reader) *http.Response {
	req, err := http.NewRequestWithContext(ctx, method, url, body)
	if err != nil {
		fmt.Fprintf(os.Stderr, "request error: %v\n", err)
		os.Exit(1)
	}
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	resp, err := client.Do(req)
	if err != nil {
		fmt.Fprintf(os.Stderr, "http error: %v\n", err)
		os.Exit(1)
	}
	if resp.StatusCode >= 300 {
		defer resp.Body.Close()
		data, _ := io.ReadAll(resp.Body)
		fmt.Fprintf(os.Stderr, "request failed: %s\n", strings.TrimSpace(string(data)))
		os.Exit(1)
	}
	return resp
}

func usage() {
	fmt.Println(`jitae-cli [--host URL] <command>

Commands:
  templates list                List available access templates
  templates create              Create a template (requires --name, --ttl)
  requests list                 List access requests
  requests create               Submit a new access request
  requests approve              Approve a pending access request
  audit list                    Show audit log entries
  audit verify                  Fetch events and verify signatures`)
}
