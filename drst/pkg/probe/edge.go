package probe

import "drst/pkg/agent"

type EdgeTracer interface {
	Trace(tx agent.Transaction) (TraceResult, error)
}

type TraceResult struct {
	Endpoint       string   `json:"endpoint"`
	Jurisdiction   string   `json:"jurisdiction"`
	ObservedHops   []string `json:"observedHops"`
	ObservedIPs    []string `json:"observedIps"`
	ObservedRegion string   `json:"observedRegion"`
}
