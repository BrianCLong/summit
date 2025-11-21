package sdn

import (
	"sort"
	"strings"
)

// GraphView represents the semantic state replicated across participants.
type GraphView struct {
	Motifs         map[string]Motif
	Causality      map[string]CausalityRelation
	Contradictions map[string]Contradiction
	Clock          LamportClock
}

// NewGraphView creates an empty, properly initialised view.
func NewGraphView() GraphView {
	return GraphView{
		Motifs:         make(map[string]Motif),
		Causality:      make(map[string]CausalityRelation),
		Contradictions: make(map[string]Contradiction),
	}
}

// LamportClock implements a monotonic logical clock used to order deltas deterministically.
type LamportClock struct {
	Value uint64
}

// Next advances the clock locally and returns the next tick.
func (c *LamportClock) Next() uint64 {
	c.Value++
	return c.Value
}

// Merge observes an external tick and ensures the local clock is not behind.
func (c *LamportClock) Merge(external uint64) uint64 {
	if external > c.Value {
		c.Value = external
	}
	return c.Value
}

// Observe applies the Lamport merge-and-tick behaviour for an incoming timestamp.
func (c *LamportClock) Observe(external uint64) uint64 {
	if external > c.Value {
		c.Value = external
	}
	c.Value++
	return c.Value
}

// Motif captures a canonicalised subgraph (motif) within the semantic graph.
type Motif struct {
	Name       string
	Nodes      []string
	Edges      []Edge
	Attributes map[string]string
}

// Edge represents an undirected connection used for motif canonicalisation.
type Edge struct {
	A string
	B string
}

// Canonical returns a normalised motif used for comparisons and hashing.
func (m Motif) Canonical() Motif {
	canonical := Motif{
		Name:       m.Name,
		Nodes:      append([]string(nil), m.Nodes...),
		Attributes: copyStringMap(m.Attributes),
	}
	sort.Strings(canonical.Nodes)

	edges := make([]Edge, len(m.Edges))
	for i, e := range m.Edges {
		canonicalEdge := e
		if canonicalEdge.A > canonicalEdge.B {
			canonicalEdge.A, canonicalEdge.B = canonicalEdge.B, canonicalEdge.A
		}
		edges[i] = canonicalEdge
	}
	sort.Slice(edges, func(i, j int) bool {
		if edges[i].A == edges[j].A {
			return edges[i].B < edges[j].B
		}
		return edges[i].A < edges[j].A
	})
	canonical.Edges = edges
	return canonical
}

// Key returns a stable identifier for the motif regardless of isomorphic ordering.
func (m Motif) Key() string {
	c := m.Canonical()
	parts := []string{c.Name, strings.Join(c.Nodes, ",")}
	edgeParts := make([]string, len(c.Edges))
	for i, e := range c.Edges {
		edgeParts[i] = e.A + "-" + e.B
	}
	parts = append(parts, strings.Join(edgeParts, ";"))
	parts = append(parts, mapToPairs(c.Attributes))
	return strings.Join(parts, "|")
}

// Equal tests structural equality of motifs.
func (m Motif) Equal(other Motif) bool {
	c1 := m.Canonical()
	c2 := other.Canonical()
	if c1.Name != c2.Name {
		return false
	}
	if len(c1.Nodes) != len(c2.Nodes) {
		return false
	}
	for i := range c1.Nodes {
		if c1.Nodes[i] != c2.Nodes[i] {
			return false
		}
	}
	if len(c1.Edges) != len(c2.Edges) {
		return false
	}
	for i := range c1.Edges {
		if c1.Edges[i] != c2.Edges[i] {
			return false
		}
	}
	return mapsEqual(c1.Attributes, c2.Attributes)
}

// Direction captures the orientation of causality relative to the canonical entity ordering.
type Direction string

const (
	DirectionForward       Direction = "forward"
	DirectionBackward      Direction = "backward"
	DirectionBidirectional Direction = "bidirectional"
)

// Polarity expresses reinforcement or inhibition relationships for causality links.
type Polarity string

const (
	PolarityPositive Polarity = "positive"
	PolarityNegative Polarity = "negative"
	PolarityNeutral  Polarity = "neutral"
)

// CausalityRelation stores directional influence between two semantic entities.
type CausalityRelation struct {
	Entities  [2]string
	Direction Direction
	Polarity  Polarity
	Metadata  map[string]string
}

// Canonical normalises entity ordering and direction encoding.
func (c CausalityRelation) Canonical() CausalityRelation {
	canonical := CausalityRelation{
		Entities:  [2]string{c.Entities[0], c.Entities[1]},
		Direction: c.Direction,
		Polarity:  c.Polarity,
		Metadata:  copyStringMap(c.Metadata),
	}
	if canonical.Entities[0] > canonical.Entities[1] {
		canonical.Entities[0], canonical.Entities[1] = canonical.Entities[1], canonical.Entities[0]
		switch canonical.Direction {
		case DirectionForward:
			canonical.Direction = DirectionBackward
		case DirectionBackward:
			canonical.Direction = DirectionForward
		}
	}
	return canonical
}

// Key returns the unordered identity for the causal pair.
func (c CausalityRelation) Key() string {
	canonical := c.Canonical()
	return canonical.Entities[0] + "|" + canonical.Entities[1]
}

// Equal reports whether two causal relations share identical semantics.
func (c CausalityRelation) Equal(other CausalityRelation) bool {
	c1 := c.Canonical()
	c2 := other.Canonical()
	if c1.Direction != c2.Direction || c1.Polarity != c2.Polarity {
		return false
	}
	if c1.Entities != c2.Entities {
		return false
	}
	return mapsEqual(c1.Metadata, c2.Metadata)
}

// Contradiction represents a mutually exclusive statement pair and its resolution status.
type Contradiction struct {
	Statements [2]string
	Status     ContradictionStatus
	Metadata   map[string]string
}

// ContradictionStatus enumerates lifecycle stages for contradictions.
type ContradictionStatus string

const (
	ContradictionOpen      ContradictionStatus = "open"
	ContradictionResolved  ContradictionStatus = "resolved"
	ContradictionEscalated ContradictionStatus = "escalated"
)

// Canonical normalises statement ordering for contradiction tracking.
func (c Contradiction) Canonical() Contradiction {
	canonical := Contradiction{
		Statements: c.Statements,
		Status:     c.Status,
		Metadata:   copyStringMap(c.Metadata),
	}
	if canonical.Statements[0] > canonical.Statements[1] {
		canonical.Statements[0], canonical.Statements[1] = canonical.Statements[1], canonical.Statements[0]
	}
	return canonical
}

// Key returns a stable identifier for the contradiction pair.
func (c Contradiction) Key() string {
	canonical := c.Canonical()
	return canonical.Statements[0] + "|" + canonical.Statements[1]
}

// Equal checks whether two contradiction records are semantically equivalent.
func (c Contradiction) Equal(other Contradiction) bool {
	c1 := c.Canonical()
	c2 := other.Canonical()
	if c1.Statements != c2.Statements {
		return false
	}
	if c1.Status != c2.Status {
		return false
	}
	return mapsEqual(c1.Metadata, c2.Metadata)
}

func copyStringMap(in map[string]string) map[string]string {
	if len(in) == 0 {
		return nil
	}
	out := make(map[string]string, len(in))
	for k, v := range in {
		out[k] = v
	}
	return out
}

func mapToPairs(m map[string]string) string {
	if len(m) == 0 {
		return ""
	}
	pairs := make([]string, 0, len(m))
	keys := make([]string, 0, len(m))
	for k := range m {
		keys = append(keys, k)
	}
	sort.Strings(keys)
	for _, k := range keys {
		pairs = append(pairs, k+"="+m[k])
	}
	return strings.Join(pairs, ",")
}

func mapsEqual(a, b map[string]string) bool {
	if len(a) != len(b) {
		return false
	}
	for k, v := range a {
		if b[k] != v {
			return false
		}
	}
	return true
}

// normalizeView produces a copy of the view with canonical keys and values.
func normalizeView(view GraphView) GraphView {
	normalized := GraphView{
		Motifs:         make(map[string]Motif, len(view.Motifs)),
		Causality:      make(map[string]CausalityRelation, len(view.Causality)),
		Contradictions: make(map[string]Contradiction, len(view.Contradictions)),
		Clock:          view.Clock,
	}
	for _, motif := range view.Motifs {
		c := motif.Canonical()
		normalized.Motifs[c.Key()] = c
	}
	for _, relation := range view.Causality {
		c := relation.Canonical()
		normalized.Causality[c.Key()] = c
	}
	for _, contradiction := range view.Contradictions {
		c := contradiction.Canonical()
		normalized.Contradictions[c.Key()] = c
	}
	return normalized
}
