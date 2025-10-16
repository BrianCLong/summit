package engine

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"time"

	"github.com/summit/orchestration/runtime/internal/model"
	"github.com/summit/orchestration/runtime/internal/state"
)

// Executor orchestrates deterministic workflow execution.
type Executor struct {
	store *state.Store
}

// NewExecutor constructs an Executor.
func NewExecutor(store *state.Store) *Executor {
	return &Executor{store: store}
}

// Start registers a workflow run and begins execution asynchronously.
func (e *Executor) Start(ctx context.Context, req model.StartRequest) (string, error) {
	if req.Actor == "" {
		req.Actor = "system"
	}
	if req.IR.SpecHash == "" {
		return "", fmt.Errorf("specHash is required")
	}

	slot := time.Now().UTC().Truncate(5 * time.Second).Format(time.RFC3339)
	hashBytes := sha256.Sum256([]byte(req.IR.SpecHash + "|" + slot))
	runID := hex.EncodeToString(hashBytes[:8])

	if err := e.store.BeginRun(ctx, runID, req.Actor, req.Tags, req.IR, req.Inputs); err != nil {
		return "", err
	}

	go e.execute(context.Background(), runID, req)
	return runID, nil
}

// Status returns the current execution status for a run.
func (e *Executor) Status(ctx context.Context, runID string) (*model.Status, error) {
	return e.store.Status(ctx, runID)
}

func (e *Executor) execute(ctx context.Context, runID string, req model.StartRequest) {
	graph := buildAdjacency(req.IR)
	order, err := topoSort(graph)
	if err != nil {
		_ = e.store.Fail(ctx, runID, err.Error())
		return
	}

	for _, nodeID := range order {
		select {
		case <-ctx.Done():
			_ = e.store.Fail(context.Background(), runID, "context canceled")
			return
		default:
		}

		node := findNode(req.IR.Nodes, nodeID)
		if node == nil {
			_ = e.store.Fail(ctx, runID, "node not found")
			return
		}

		if err := e.store.MarkCurrent(ctx, runID, node.ID); err != nil {
			_ = e.store.Fail(ctx, runID, err.Error())
			return
		}

		if err := e.executeWithRetry(ctx, runID, *node, req); err != nil {
			_ = e.store.Fail(ctx, runID, err.Error())
			return
		}
	}

	_ = e.store.Succeed(ctx, runID)
}

func (e *Executor) executeWithRetry(ctx context.Context, runID string, node model.Node, req model.StartRequest) error {
	attempts := 0
	for {
		attempts++
		err := e.callActivity(ctx, runID, node)
		if err == nil {
			return nil
		}

		if attempts >= max(1, req.IR.Retry.MaxAttempts) {
			return err
		}

		backoff := time.Duration(req.IR.Retry.BaseMs*attempts) * time.Millisecond
		if backoff <= 0 {
			backoff = 250 * time.Millisecond
		}
		time.Sleep(backoff)
	}
}

func (e *Executor) callActivity(ctx context.Context, runID string, node model.Node) error {
	switch node.Uses {
	case "http.get":
		return e.store.RecordHTTPCall(ctx, runID, node, "GET")
	case "http.post":
		return e.store.RecordHTTPCall(ctx, runID, node, "POST")
	case "kafka.publish":
		return e.store.RecordKafkaPublish(ctx, runID, node)
	default:
		return e.store.RecordNoop(ctx, runID, node)
	}
}

func buildAdjacency(ir model.IRDag) map[string][]string {
	adjacency := make(map[string][]string)
	for _, node := range ir.Nodes {
		adjacency[node.ID] = []string{}
	}
	for _, edge := range ir.Edges {
		adjacency[edge.From] = append(adjacency[edge.From], edge.To)
	}
	return adjacency
}

func topoSort(adj map[string][]string) ([]string, error) {
	indegree := make(map[string]int)
	for node := range adj {
		indegree[node] = 0
	}
	for from := range adj {
		for _, to := range adj[from] {
			indegree[to]++
		}
	}

	queue := make([]string, 0)
	for node, degree := range indegree {
		if degree == 0 {
			queue = append(queue, node)
		}
	}

	order := make([]string, 0, len(adj))
	for len(queue) > 0 {
		current := queue[0]
		queue = queue[1:]
		order = append(order, current)
		for _, next := range adj[current] {
			indegree[next]--
			if indegree[next] == 0 {
				queue = append(queue, next)
			}
		}
	}

	if len(order) != len(adj) {
		return nil, errors.New("cycle detected")
	}
	return order, nil
}

func findNode(nodes []model.Node, id string) *model.Node {
	for i := range nodes {
		if nodes[i].ID == id {
			return &nodes[i]
		}
	}
	return nil
}

func max(a, b int) int {
	if a > b {
		return a
	}
	return b
}
