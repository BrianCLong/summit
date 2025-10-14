package main

import (
  "encoding/json"
  "fmt"
  "os"
)

func main() {
  if len(os.Args) < 2 {
    fmt.Println("usage: prov-verify <path>")
    os.Exit(2)
  }
  manifestPath := fmt.Sprintf("%s/hash-manifest.json", os.Args[1])
  data, err := os.ReadFile(manifestPath)
  if err != nil {
    fmt.Fprintf(os.Stderr, "error: %v\n", err)
    os.Exit(1)
  }
  var manifest map[string]any
  if err := json.Unmarshal(data, &manifest); err != nil {
    fmt.Fprintf(os.Stderr, "invalid manifest: %v\n", err)
    os.Exit(1)
  }
  fmt.Println("OK: manifest structure valid")
}
