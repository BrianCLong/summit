package dag

import (
	"errors"
	"fmt"
	"sort"
)

// Edge represents a dependency edge.
type Edge struct {
	From string `json:"from"`
	To   string `json:"to"`
}

// Node models adjacency information.
type Node struct {
	ID           string
	Dependencies map[string]struct{}
	Dependents   map[string]struct{}
}

// DAG is a lightweight directed acyclic graph implementation.
type DAG struct {
	nodes map[string]*Node
}

// New constructs an empty DAG.
func New() *DAG {
	return &DAG{nodes: make(map[string]*Node)}
}

// Clone creates a deep copy of the DAG.
func (d *DAG) Clone() *DAG {
	cp := New()
	for id, node := range d.nodes {
		cpNode := &Node{ID: node.ID, Dependencies: make(map[string]struct{}, len(node.Dependencies)), Dependents: make(map[string]struct{}, len(node.Dependents))}
		for dep := range node.Dependencies {
			cpNode.Dependencies[dep] = struct{}{}
		}
		for dep := range node.Dependents {
			cpNode.Dependents[dep] = struct{}{}
		}
		cp.nodes[id] = cpNode
	}
	return cp
}

// EnsureNode ensures the node exists in the graph.
func (d *DAG) EnsureNode(id string) {
	if _, ok := d.nodes[id]; !ok {
		d.nodes[id] = &Node{ID: id, Dependencies: make(map[string]struct{}), Dependents: make(map[string]struct{})}
	}
}

// AddEdge adds a dependency edge from -> to (from depends on to).
func (d *DAG) AddEdge(from, to string) error {
	if from == to {
		return errors.New("self-dependency not allowed")
	}
	d.EnsureNode(from)
	d.EnsureNode(to)
	if _, ok := d.nodes[from].Dependencies[to]; ok {
		return nil
	}
	// detect cycle by checking if 'from' is reachable from 'to'
	if d.hasPath(to, from) {
		return fmt.Errorf("adding %s -> %s introduces cycle", from, to)
	}
	d.nodes[from].Dependencies[to] = struct{}{}
	d.nodes[to].Dependents[from] = struct{}{}
	return nil
}

// Dependents returns all nodes that depend on the provided node.
func (d *DAG) Dependents(id string) []string {
	node, ok := d.nodes[id]
	if !ok {
		return nil
	}
	res := make([]string, 0, len(node.Dependents))
	visited := map[string]struct{}{}
	var dfs func(string)
	dfs = func(n string) {
		if _, seen := visited[n]; seen {
			return
		}
		visited[n] = struct{}{}
		res = append(res, n)
		for dep := range d.nodes[n].Dependents {
			dfs(dep)
		}
	}
	for dep := range node.Dependents {
		dfs(dep)
	}
	sort.Strings(res)
	return res
}

// Dependencies returns direct dependencies for a node.
func (d *DAG) Dependencies(id string) []string {
	node, ok := d.nodes[id]
	if !ok {
		return nil
	}
	res := make([]string, 0, len(node.Dependencies))
	for dep := range node.Dependencies {
		res = append(res, dep)
	}
	sort.Strings(res)
	return res
}

// TopoSort returns a topological ordering of the nodes.
func (d *DAG) TopoSort() ([]string, error) {
	indegree := make(map[string]int, len(d.nodes))
	for id := range d.nodes {
		indegree[id] = len(d.nodes[id].Dependencies)
	}
	queue := make([]string, 0)
	for id, degree := range indegree {
		if degree == 0 {
			queue = append(queue, id)
		}
	}
	sort.Strings(queue)
	res := make([]string, 0, len(d.nodes))
	for len(queue) > 0 {
		sort.Strings(queue)
		id := queue[0]
		queue = queue[1:]
		res = append(res, id)
		for dep := range d.nodes[id].Dependents {
			indegree[dep]--
			if indegree[dep] == 0 {
				queue = append(queue, dep)
			}
		}
	}
	if len(res) != len(d.nodes) {
		return nil, errors.New("graph contains cycles")
	}
	return res, nil
}

// Impact returns nodes impacted if the provided node changes (downstream dependents including the node itself).
func (d *DAG) Impact(id string) []string {
	impact := []string{id}
	seen := map[string]struct{}{id: {}}
	var visit func(string)
	visit = func(n string) {
		node, ok := d.nodes[n]
		if !ok {
			return
		}
		for dep := range node.Dependents {
			if _, ok := seen[dep]; ok {
				continue
			}
			seen[dep] = struct{}{}
			impact = append(impact, dep)
			visit(dep)
		}
	}
	visit(id)
	sort.Strings(impact)
	return impact
}

// Edges returns the deterministic list of edges.
func (d *DAG) Edges() []Edge {
	edges := make([]Edge, 0)
	for id, node := range d.nodes {
		for dep := range node.Dependencies {
			edges = append(edges, Edge{From: id, To: dep})
		}
	}
	sort.Slice(edges, func(i, j int) bool {
		if edges[i].From == edges[j].From {
			return edges[i].To < edges[j].To
		}
		return edges[i].From < edges[j].From
	})
	return edges
}

func (d *DAG) hasPath(from, target string) bool {
	if from == target {
		return true
	}
	node, ok := d.nodes[from]
	if !ok {
		return false
	}
	for dep := range node.Dependencies {
		if d.hasPath(dep, target) {
			return true
		}
	}
	return false
}
