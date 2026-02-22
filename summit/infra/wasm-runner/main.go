package main
import ( "encoding/json"; "os"; "time" )
type Telemetry struct {
  RunId string `json:"runId"`; Agent string `json:"agent"`; Tool string `json:"tool"`
  Start int64 `json:"start_ts"`; Duration int64 `json:"duration_ms"`
  CpuMs int64 `json:"cpu_ms"`; MemBytes int64 `json:"mem_bytes"`
  IOHash string `json:"io_hash"`; Decision string `json:"decision"`; Signature string `json:"signature"`
}
func main() {
  start := time.Now()
  // … invoke WASI module (omitted for brevity) …
  tel := Telemetry{
    RunId: os.Getenv("RUN_ID"), Agent: os.Getenv("AGENT"), Tool: os.Getenv("TOOL"),
    Start: start.UnixMilli(), Duration: time.Since(start).Milliseconds(),
    CpuMs: 0, MemBytes: 0, IOHash: os.Getenv("IO_HASH"), Decision: os.Getenv("DECISION"), Signature: "",
  }
  f, _ := os.Create(os.Getenv("TELEMETRY_PATH"))
  defer f.Close(); _ = json.NewEncoder(f).Encode(tel)
}
