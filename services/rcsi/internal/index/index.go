package index

import (
	"encoding/json"
	"errors"
	"fmt"
	"sort"
	"sync"
	"time"
)

// Document represents a searchable record tracked by the index service.
type Document struct {
	ID        string            `json:"id"`
	Tokens    []string          `json:"tokens"`
	Vector    []float64         `json:"vector"`
	Metadata  map[string]string `json:"metadata,omitempty"`
	UpdatedAt time.Time         `json:"updatedAt"`
}

// RedactionEvent captures a redaction/RTBF mutation that needs to be applied.
type RedactionEvent struct {
	Type       RedactionType `json:"type"`
	DocumentID string        `json:"documentId,omitempty"`
	Term       string        `json:"term,omitempty"`
	Reason     string        `json:"reason"`
}

// RedactionType enumerates the types of redactions the index tracks.
type RedactionType string

const (
	// RedactionTypeDocument fully removes a document from all indices.
	RedactionTypeDocument RedactionType = "document"
	// RedactionTypeTerm removes a specific term/document association.
	RedactionTypeTerm RedactionType = "term"
)

// ProofKind distinguishes the supported negative proof flavours.
type ProofKind string

const (
	ProofKindDocument ProofKind = "document"
	ProofKindTerm     ProofKind = "term"
)

// Tombstone captures an immutable deletion record.
type Tombstone struct {
	Term       string    `json:"term,omitempty"`
	DocumentID string    `json:"documentId"`
	Reason     string    `json:"reason"`
	Sequence   uint64    `json:"sequence"`
	Timestamp  time.Time `json:"timestamp"`
	Digest     string    `json:"digest"`
	Version    uint64    `json:"version"`
}

// tombstoneView is used to provide deterministic JSON snapshots.
type tombstoneView struct {
	Term       string `json:"term,omitempty"`
	DocumentID string `json:"documentId"`
	Reason     string `json:"reason"`
	Sequence   uint64 `json:"sequence"`
	Timestamp  string `json:"timestamp"`
	Digest     string `json:"digest"`
	Version    uint64 `json:"version"`
}

// Proof provides an offline verifiable negative inclusion proof.
type Proof struct {
	Kind      ProofKind `json:"kind"`
	Term      string    `json:"term,omitempty"`
	Document  string    `json:"documentId"`
	Query     string    `json:"query"`
	Tombstone Tombstone `json:"tombstone"`
	Version   uint64    `json:"version"`
}

// proofView is used for deterministic snapshots of proofs.
type proofView struct {
	Kind      ProofKind     `json:"kind"`
	Term      string        `json:"term,omitempty"`
	Document  string        `json:"documentId"`
	Query     string        `json:"query"`
	Tombstone tombstoneView `json:"tombstone"`
	Version   uint64        `json:"version"`
}

// InvertedPosting is a deterministic view of a postings list.
type InvertedPosting struct {
	Term      string   `json:"term"`
	Documents []string `json:"documents"`
}

// VectorEntry is a deterministic snapshot of a vector index entry.
type VectorEntry struct {
	DocumentID string    `json:"documentId"`
	Vector     []float64 `json:"vector"`
}

// DocumentView is a deterministic view of a document.
type DocumentView struct {
	ID        string            `json:"id"`
	Tokens    []string          `json:"tokens"`
	Vector    []float64         `json:"vector"`
	Metadata  map[string]string `json:"metadata,omitempty"`
	UpdatedAt string            `json:"updatedAt"`
}

// TermTombstoneView groups tombstones by term.
type TermTombstoneView struct {
	Term       string          `json:"term"`
	Tombstones []tombstoneView `json:"tombstones"`
}

// IndexSnapshot fully describes the index in a deterministic form.
type IndexSnapshot struct {
	Version            uint64              `json:"version"`
	Documents          []DocumentView      `json:"documents"`
	InvertedPostings   []InvertedPosting   `json:"inverted"`
	VectorEntries      []VectorEntry       `json:"vectors"`
	DocumentTombstones []tombstoneView     `json:"documentTombstones"`
	TermTombstones     []TermTombstoneView `json:"termTombstones"`
	Proofs             []proofView         `json:"proofs"`
}

// ReconcileReport captures the outcome of reconciling the corpus against the indices.
type ReconcileReport struct {
	Version        uint64              `json:"version"`
	StaleTokens    map[string][]string `json:"staleTokens"`
	StaleVectors   []string            `json:"staleVectors"`
	MissingTokens  map[string][]string `json:"missingTokens"`
	MissingVectors []string            `json:"missingVectors"`
}

// clockFn provides a hook for deterministic time sources.
type clockFn func() time.Time

// Index manages inverted and vector indices while tracking tombstones.
type Index struct {
	mu sync.RWMutex

	clock clockFn

	version  uint64
	sequence uint64

	corpus   map[string]Document
	inverted map[string]map[string]struct{}
	vectors  map[string][]float64

	documentTombstones map[string]Tombstone
	termTombstones     map[string]map[string]Tombstone
}

// Option configures the index instance.
type Option func(*Index)

// WithClock overrides the default clock used for timestamps.
func WithClock(fn clockFn) Option {
	return func(i *Index) {
		if fn != nil {
			i.clock = fn
		}
	}
}

// New creates a new Index.
func New(opts ...Option) *Index {
	idx := &Index{
		clock:              time.Now,
		corpus:             make(map[string]Document),
		inverted:           make(map[string]map[string]struct{}),
		vectors:            make(map[string][]float64),
		documentTombstones: make(map[string]Tombstone),
		termTombstones:     make(map[string]map[string]Tombstone),
	}
	for _, opt := range opts {
		opt(idx)
	}
	return idx
}

// AddDocument indexes the provided document.
func (idx *Index) AddDocument(doc Document) error {
	if doc.ID == "" {
		return errors.New("document id is required")
	}

	idx.mu.Lock()
	defer idx.mu.Unlock()

	now := idx.clock()
	doc.UpdatedAt = now
	cloned := cloneDocument(doc)

	idx.corpus[doc.ID] = cloned
	idx.vectors[doc.ID] = append([]float64(nil), doc.Vector...)

	idx.removeDocFromInvertedLocked(doc.ID)
	for _, token := range doc.Tokens {
		if token == "" {
			continue
		}
		if _, ok := idx.inverted[token]; !ok {
			idx.inverted[token] = make(map[string]struct{})
		}
		idx.inverted[token][doc.ID] = struct{}{}
	}

	idx.version++
	return nil
}

// RedactDocument completely removes a document from the index.
func (idx *Index) RedactDocument(id, reason string) error {
	if id == "" {
		return errors.New("document id is required")
	}

	idx.mu.Lock()
	defer idx.mu.Unlock()

	doc, ok := idx.corpus[id]
	if ok {
		for _, token := range doc.Tokens {
			if postings, exists := idx.inverted[token]; exists {
				delete(postings, id)
				if len(postings) == 0 {
					delete(idx.inverted, token)
				}
			}
		}
		delete(idx.corpus, id)
	}

	delete(idx.vectors, id)

	idx.sequence++
	ts := Tombstone{
		DocumentID: id,
		Reason:     reason,
		Sequence:   idx.sequence,
		Timestamp:  idx.clock(),
		Version:    idx.version + 1,
	}
	ts.Digest = digestFor("document", ts.Term, ts.DocumentID, ts.Sequence, ts.Timestamp, ts.Reason, ts.Version)
	idx.documentTombstones[id] = ts

	idx.version++
	return nil
}

// RedactTerm removes a specific term/document association.
func (idx *Index) RedactTerm(term, documentID, reason string) error {
	if term == "" {
		return errors.New("term is required")
	}
	if documentID == "" {
		return errors.New("document id is required")
	}

	idx.mu.Lock()
	defer idx.mu.Unlock()

	if postings, ok := idx.inverted[term]; ok {
		delete(postings, documentID)
		if len(postings) == 0 {
			delete(idx.inverted, term)
		}
	}

	if doc, ok := idx.corpus[documentID]; ok {
		filtered := make([]string, 0, len(doc.Tokens))
		for _, token := range doc.Tokens {
			if token == term {
				continue
			}
			filtered = append(filtered, token)
		}
		doc.Tokens = filtered
		idx.corpus[documentID] = doc
	}

	idx.sequence++
	ts := Tombstone{
		Term:       term,
		DocumentID: documentID,
		Reason:     reason,
		Sequence:   idx.sequence,
		Timestamp:  idx.clock(),
		Version:    idx.version + 1,
	}
	ts.Digest = digestFor("term", ts.Term, ts.DocumentID, ts.Sequence, ts.Timestamp, ts.Reason, ts.Version)

	if _, ok := idx.termTombstones[term]; !ok {
		idx.termTombstones[term] = make(map[string]Tombstone)
	}
	idx.termTombstones[term][documentID] = ts

	idx.version++
	return nil
}

// SelectiveReindex rebuilds a subset of the indices.
func (idx *Index) SelectiveReindex(documentIDs []string) {
	idx.mu.Lock()
	defer idx.mu.Unlock()

	for _, id := range documentIDs {
		doc, ok := idx.corpus[id]
		if !ok {
			continue
		}
		idx.removeDocFromInvertedLocked(id)
		for _, token := range doc.Tokens {
			if token == "" {
				continue
			}
			if _, ok := idx.inverted[token]; !ok {
				idx.inverted[token] = make(map[string]struct{})
			}
			idx.inverted[token][doc.ID] = struct{}{}
		}
		idx.vectors[id] = append([]float64(nil), doc.Vector...)
	}

	idx.version++
}

// Snapshot returns a deterministic representation of the indices.
func (idx *Index) Snapshot() IndexSnapshot {
	idx.mu.RLock()
	defer idx.mu.RUnlock()

	snapshot := IndexSnapshot{
		Version: idx.version,
	}

	docs := make([]DocumentView, 0, len(idx.corpus))
	for _, doc := range idx.corpus {
		view := DocumentView{
			ID:        doc.ID,
			Tokens:    append([]string(nil), doc.Tokens...),
			Vector:    append([]float64(nil), doc.Vector...),
			UpdatedAt: doc.UpdatedAt.UTC().Format(time.RFC3339Nano),
		}
		if doc.Metadata != nil {
			view.Metadata = cloneMap(doc.Metadata)
		}
		docs = append(docs, view)
	}
	sort.Slice(docs, func(i, j int) bool {
		return docs[i].ID < docs[j].ID
	})
	snapshot.Documents = docs

	inverted := make([]InvertedPosting, 0, len(idx.inverted))
	for term, postings := range idx.inverted {
		docIDs := make([]string, 0, len(postings))
		for docID := range postings {
			docIDs = append(docIDs, docID)
		}
		sort.Strings(docIDs)
		inverted = append(inverted, InvertedPosting{Term: term, Documents: docIDs})
	}
	sort.Slice(inverted, func(i, j int) bool {
		return inverted[i].Term < inverted[j].Term
	})
	snapshot.InvertedPostings = inverted

	vectors := make([]VectorEntry, 0, len(idx.vectors))
	for docID, vec := range idx.vectors {
		vectors = append(vectors, VectorEntry{DocumentID: docID, Vector: append([]float64(nil), vec...)})
	}
	sort.Slice(vectors, func(i, j int) bool {
		return vectors[i].DocumentID < vectors[j].DocumentID
	})
	snapshot.VectorEntries = vectors

	docTombstones := make([]tombstoneView, 0, len(idx.documentTombstones))
	for _, ts := range idx.documentTombstones {
		docTombstones = append(docTombstones, toTombstoneView(ts))
	}
	sort.Slice(docTombstones, func(i, j int) bool {
		if docTombstones[i].Sequence == docTombstones[j].Sequence {
			return docTombstones[i].DocumentID < docTombstones[j].DocumentID
		}
		return docTombstones[i].Sequence < docTombstones[j].Sequence
	})
	snapshot.DocumentTombstones = docTombstones

	termTombstones := make([]TermTombstoneView, 0, len(idx.termTombstones))
	for term, tombstones := range idx.termTombstones {
		group := TermTombstoneView{Term: term}
		for _, ts := range tombstones {
			group.Tombstones = append(group.Tombstones, toTombstoneView(ts))
		}
		sort.Slice(group.Tombstones, func(i, j int) bool {
			if group.Tombstones[i].Sequence == group.Tombstones[j].Sequence {
				return group.Tombstones[i].DocumentID < group.Tombstones[j].DocumentID
			}
			return group.Tombstones[i].Sequence < group.Tombstones[j].Sequence
		})
		termTombstones = append(termTombstones, group)
	}
	sort.Slice(termTombstones, func(i, j int) bool {
		return termTombstones[i].Term < termTombstones[j].Term
	})
	snapshot.TermTombstones = termTombstones

	// Proofs for each tombstone to aid snapshot-based proof validation.
	proofs := make([]proofView, 0, len(docTombstones)+len(termTombstones))
	for _, ts := range snapshot.DocumentTombstones {
		proofs = append(proofs, proofView{
			Kind:      ProofKindDocument,
			Document:  ts.DocumentID,
			Query:     ts.DocumentID,
			Tombstone: ts,
			Version:   idx.version,
		})
	}
	for _, group := range snapshot.TermTombstones {
		for _, ts := range group.Tombstones {
			proofs = append(proofs, proofView{
				Kind:      ProofKindTerm,
				Term:      group.Term,
				Document:  ts.DocumentID,
				Query:     fmt.Sprintf("%s#%s", group.Term, ts.DocumentID),
				Tombstone: ts,
				Version:   idx.version,
			})
		}
	}
	sort.Slice(proofs, func(i, j int) bool {
		if proofs[i].Kind == proofs[j].Kind {
			if proofs[i].Term == proofs[j].Term {
				return proofs[i].Document < proofs[j].Document
			}
			return proofs[i].Term < proofs[j].Term
		}
		return proofs[i].Kind < proofs[j].Kind
	})
	snapshot.Proofs = proofs

	return snapshot
}

// NegativeProofDocument issues a proof that a document has been redacted.
func (idx *Index) NegativeProofDocument(id string) (Proof, error) {
	if id == "" {
		return Proof{}, errors.New("document id is required")
	}

	idx.mu.RLock()
	defer idx.mu.RUnlock()

	if _, exists := idx.corpus[id]; exists {
		return Proof{}, fmt.Errorf("document %s still present", id)
	}
	tombstone, ok := idx.documentTombstones[id]
	if !ok {
		return Proof{}, fmt.Errorf("no tombstone for document %s", id)
	}

	return Proof{
		Kind:      ProofKindDocument,
		Document:  id,
		Query:     id,
		Tombstone: tombstone,
		Version:   idx.version,
	}, nil
}

// NegativeProofTerm issues a proof that a term/document association has been redacted.
func (idx *Index) NegativeProofTerm(term, documentID string) (Proof, error) {
	if term == "" {
		return Proof{}, errors.New("term is required")
	}
	if documentID == "" {
		return Proof{}, errors.New("document id is required")
	}

	idx.mu.RLock()
	defer idx.mu.RUnlock()

	if postings, ok := idx.inverted[term]; ok {
		if _, exists := postings[documentID]; exists {
			return Proof{}, fmt.Errorf("document %s still contains term %s", documentID, term)
		}
	}

	tombstones, ok := idx.termTombstones[term]
	if !ok {
		return Proof{}, fmt.Errorf("no tombstones for term %s", term)
	}
	tombstone, ok := tombstones[documentID]
	if !ok {
		return Proof{}, fmt.Errorf("no tombstone for term %s and document %s", term, documentID)
	}

	return Proof{
		Kind:      ProofKindTerm,
		Term:      term,
		Document:  documentID,
		Query:     fmt.Sprintf("%s#%s", term, documentID),
		Tombstone: tombstone,
		Version:   idx.version,
	}, nil
}

// Reconcile compares the corpus with the indices and tombstones.
func (idx *Index) Reconcile() ReconcileReport {
	idx.mu.RLock()
	defer idx.mu.RUnlock()

	report := ReconcileReport{
		Version:       idx.version,
		StaleTokens:   make(map[string][]string),
		MissingTokens: make(map[string][]string),
	}

	// Identify stale tokens (documents referenced by postings but missing from corpus).
	for term, postings := range idx.inverted {
		for docID := range postings {
			if _, ok := idx.corpus[docID]; !ok {
				report.StaleTokens[term] = append(report.StaleTokens[term], docID)
			}
		}
	}

	// Identify stale vectors.
	for docID := range idx.vectors {
		if _, ok := idx.corpus[docID]; !ok {
			report.StaleVectors = append(report.StaleVectors, docID)
		}
	}

	// Identify missing tokens and vectors for documents still in corpus.
	for docID, doc := range idx.corpus {
		for _, token := range doc.Tokens {
			postings := idx.inverted[token]
			if postings == nil {
				report.MissingTokens[token] = append(report.MissingTokens[token], docID)
				continue
			}
			if _, ok := postings[docID]; !ok {
				report.MissingTokens[token] = append(report.MissingTokens[token], docID)
			}
		}
		if _, ok := idx.vectors[docID]; !ok {
			report.MissingVectors = append(report.MissingVectors, docID)
		}
	}

	for term := range report.StaleTokens {
		sort.Strings(report.StaleTokens[term])
	}
	for term := range report.MissingTokens {
		sort.Strings(report.MissingTokens[term])
	}
	sort.Strings(report.StaleVectors)
	sort.Strings(report.MissingVectors)

	return report
}

// ApplyFixtures loads documents and applies redactions from fixtures.
func (idx *Index) ApplyFixtures(docs []Document, redactions []RedactionEvent) error {
	for _, doc := range docs {
		if err := idx.AddDocument(doc); err != nil {
			return err
		}
	}
	for _, event := range redactions {
		switch event.Type {
		case RedactionTypeDocument:
			if err := idx.RedactDocument(event.DocumentID, event.Reason); err != nil {
				return err
			}
		case RedactionTypeTerm:
			if err := idx.RedactTerm(event.Term, event.DocumentID, event.Reason); err != nil {
				return err
			}
		default:
			return fmt.Errorf("unsupported redaction type %s", event.Type)
		}
	}
	return nil
}

// ExportSnapshot renders the snapshot as a formatted JSON payload.
func ExportSnapshot(snapshot IndexSnapshot) ([]byte, error) {
	return json.MarshalIndent(snapshot, "", "  ")
}

func cloneDocument(doc Document) Document {
	cloned := Document{
		ID:        doc.ID,
		Tokens:    append([]string(nil), doc.Tokens...),
		Vector:    append([]float64(nil), doc.Vector...),
		UpdatedAt: doc.UpdatedAt,
	}
	if doc.Metadata != nil {
		cloned.Metadata = cloneMap(doc.Metadata)
	}
	return cloned
}

func cloneMap(m map[string]string) map[string]string {
	if m == nil {
		return nil
	}
	cloned := make(map[string]string, len(m))
	for k, v := range m {
		cloned[k] = v
	}
	return cloned
}

func toTombstoneView(ts Tombstone) tombstoneView {
	return tombstoneView{
		Term:       ts.Term,
		DocumentID: ts.DocumentID,
		Reason:     ts.Reason,
		Sequence:   ts.Sequence,
		Timestamp:  ts.Timestamp.UTC().Format(time.RFC3339Nano),
		Digest:     ts.Digest,
		Version:    ts.Version,
	}
}

func (idx *Index) removeDocFromInvertedLocked(documentID string) {
	for term, postings := range idx.inverted {
		delete(postings, documentID)
		if len(postings) == 0 {
			delete(idx.inverted, term)
		}
	}
}
