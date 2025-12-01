package main

import (
	"bytes"
	"crypto/ed25519"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"net/http"
	"os"
	"time"
)

type signedTreeHead struct {
	TreeSize  int       `json:"tree_size"`
	RootHash  string    `json:"root_hash"`
	Timestamp time.Time `json:"timestamp"`
	Signature string    `json:"signature"`
}

type stateFile struct {
	TreeSize int    `json:"tree_size"`
	RootHash string `json:"root_hash"`
}

func main() {
	endpoint := flag.String("endpoint", "http://localhost:8080", "IDTL endpoint")
	statePath := flag.String("state", "idtl_witness_state.json", "state file path")
	flag.Parse()

	client := &http.Client{Timeout: 10 * time.Second}

	sth, err := fetchSTH(client, *endpoint+"/tree/head")
	if err != nil {
		fmt.Fprintf(os.Stderr, "failed to fetch STH: %v\n", err)
		os.Exit(1)
	}
	pubKey, err := fetchPubKey(client, *endpoint+"/tree/pubkey")
	if err != nil {
		fmt.Fprintf(os.Stderr, "failed to fetch public key: %v\n", err)
		os.Exit(1)
	}
	if err := verifySignature(sth, pubKey); err != nil {
		fmt.Fprintf(os.Stderr, "invalid STH signature: %v\n", err)
		os.Exit(1)
	}

	prev, err := readState(*statePath)
	if err != nil && !os.IsNotExist(err) {
		fmt.Fprintf(os.Stderr, "failed to read state: %v\n", err)
		os.Exit(1)
	}

	if prev != nil {
		if prev.TreeSize == sth.TreeSize && prev.RootHash != sth.RootHash {
			fmt.Fprintf(os.Stderr, "equivocation detected: same tree size but different root\n")
			os.Exit(1)
		}
		if prev.TreeSize > sth.TreeSize {
			fmt.Fprintf(os.Stderr, "log shrank from %d to %d\n", prev.TreeSize, sth.TreeSize)
			os.Exit(1)
		}
		if prev.TreeSize > 0 {
			oldLeaves, err := fetchLeafHashes(client, *endpoint, prev.TreeSize)
			if err != nil {
				fmt.Fprintf(os.Stderr, "failed to fetch historical leaves: %v\n", err)
				os.Exit(1)
			}
			oldRoot := computeRoot(oldLeaves)
			expectedOld, _ := base64.StdEncoding.DecodeString(prev.RootHash)
			if !bytes.Equal(oldRoot, expectedOld) {
				fmt.Fprintf(os.Stderr, "recomputed old root does not match stored root\n")
				os.Exit(1)
			}
			newLeaves, err := fetchLeafHashes(client, *endpoint, sth.TreeSize)
			if err != nil {
				fmt.Fprintf(os.Stderr, "failed to fetch current leaves: %v\n", err)
				os.Exit(1)
			}
			for i := 0; i < prev.TreeSize; i++ {
				if !bytes.Equal(oldLeaves[i], newLeaves[i]) {
					fmt.Fprintf(os.Stderr, "leaf prefix mismatch; potential equivocation\n")
					os.Exit(1)
				}
			}
			newRoot := computeRoot(newLeaves)
			expectedNew, _ := base64.StdEncoding.DecodeString(sth.RootHash)
			if !bytes.Equal(newRoot, expectedNew) {
				fmt.Fprintf(os.Stderr, "recomputed root does not match STH\n")
				os.Exit(1)
			}
		}
	}

	if err := writeState(*statePath, &stateFile{TreeSize: sth.TreeSize, RootHash: sth.RootHash}); err != nil {
		fmt.Fprintf(os.Stderr, "failed to persist state: %v\n", err)
		os.Exit(1)
	}
	fmt.Printf("Witness update successful. Tree size=%d root=%s\n", sth.TreeSize, sth.RootHash)
}

func fetchSTH(client *http.Client, url string) (*signedTreeHead, error) {
	resp, err := client.Get(url)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("unexpected status %d: %s", resp.StatusCode, string(body))
	}
	var sth signedTreeHead
	if err := json.NewDecoder(resp.Body).Decode(&sth); err != nil {
		return nil, err
	}
	return &sth, nil
}

func fetchPubKey(client *http.Client, url string) (string, error) {
	resp, err := client.Get(url)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("unexpected status %d: %s", resp.StatusCode, string(body))
	}
	var payload struct {
		PublicKey string `json:"public_key"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
		return "", err
	}
	return payload.PublicKey, nil
}

func verifySignature(sth *signedTreeHead, pubKey string) error {
	if sth.Signature == "" {
		return fmt.Errorf("missing signature")
	}
	sigBytes, err := base64.StdEncoding.DecodeString(sth.Signature)
	if err != nil {
		return err
	}
	pubBytes, err := base64.StdEncoding.DecodeString(pubKey)
	if err != nil {
		return err
	}
	payload, err := json.Marshal(struct {
		TreeSize  int    `json:"tree_size"`
		RootHash  string `json:"root_hash"`
		Timestamp string `json:"timestamp"`
	}{TreeSize: sth.TreeSize, RootHash: sth.RootHash, Timestamp: sth.Timestamp.Format(time.RFC3339Nano)})
	if err != nil {
		return err
	}
	if !ed25519.Verify(pubBytes, payload, sigBytes) {
		return fmt.Errorf("signature verification failed")
	}
	return nil
}

func readState(path string) (*stateFile, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}
	var state stateFile
	if err := json.Unmarshal(data, &state); err != nil {
		return nil, err
	}
	return &state, nil
}

func writeState(path string, state *stateFile) error {
	data, err := json.MarshalIndent(state, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(path, data, 0o600)
}

func fetchLeafHashes(client *http.Client, endpoint string, limit int) ([][]byte, error) {
	url := fmt.Sprintf("%s/tree/leaves?limit=%d", endpoint, limit)
	resp, err := client.Get(url)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("unexpected status %d: %s", resp.StatusCode, string(body))
	}
	var payload struct {
		LeafHashes []string `json:"leaf_hashes"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
		return nil, err
	}
	hashes := make([][]byte, len(payload.LeafHashes))
	for i, h := range payload.LeafHashes {
		b, err := base64.StdEncoding.DecodeString(h)
		if err != nil {
			return nil, err
		}
		hashes[i] = b
	}
	return hashes, nil
}

func computeRoot(leaves [][]byte) []byte {
	if len(leaves) == 0 {
		return nil
	}
	nodes := make([][]byte, len(leaves))
	for i := range leaves {
		nodes[i] = append([]byte(nil), leaves[i]...)
	}
	for len(nodes) > 1 {
		var next [][]byte
		for i := 0; i < len(nodes); i += 2 {
			if i+1 < len(nodes) {
				next = append(next, nodeHash(nodes[i], nodes[i+1]))
			} else {
				next = append(next, nodes[i])
			}
		}
		nodes = next
	}
	return nodes[0]
}

func nodeHash(left, right []byte) []byte {
	h := sha256Sum(append(append([]byte{1}, left...), right...))
	return h
}

func sha256Sum(data []byte) []byte {
	sum := sha256.Sum256(data)
	return sum[:]
}
