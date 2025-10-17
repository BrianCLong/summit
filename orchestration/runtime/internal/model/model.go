package model

import "time"

// Node represents a single task in the workflow IR.
type Node struct {
	ID   string         `json:"id"`
	Uses string         `json:"uses"`
	With map[string]any `json:"with,omitempty"`
}

// Edge represents a directed dependency between nodes.
type Edge struct {
	From string `json:"from"`
	To   string `json:"to"`
}

// IRDag is the canonical intermediate representation produced by the intent engine.
type IRDag struct {
	Name      string `json:"name"`
	Namespace string `json:"namespace"`
	Nodes     []Node `json:"nodes"`
	Edges     []Edge `json:"edges"`
	Retry     struct {
		Strategy    string `json:"strategy"`
		MaxAttempts int    `json:"maxAttempts"`
		BaseMs      int    `json:"baseMs"`
	} `json:"retry"`
	SpecHash string `json:"specHash"`
}

// StartRequest launches a workflow instance.
type StartRequest struct {
	IR     IRDag             `json:"ir"`
	Inputs map[string]any    `json:"inputs,omitempty"`
	Actor  string            `json:"actor,omitempty"`
	Tags   map[string]string `json:"tags,omitempty"`
}

// Status describes the execution state of a run.
type Status struct {
	RunID   string            `json:"runId"`
	State   string            `json:"state"`
	Current string            `json:"current"`
	Updated time.Time         `json:"updated"`
	Output  map[string]any    `json:"output,omitempty"`
	Tags    map[string]string `json:"tags,omitempty"`
}
