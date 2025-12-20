package log

import (
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"errors"
	"sort"
	"sync"
	"time"
)

type MetadataPair struct {
	Key   string `json:"key"`
	Value string `json:"value"`
}

type Entry struct {
	ID             string            `json:"id"`
	Timestamp      time.Time         `json:"timestamp"`
	Decision       string            `json:"decision,omitempty"`
	Redacted       bool              `json:"redacted"`
	DisclosureHash string            `json:"disclosure_hash,omitempty"`
	Metadata       map[string]string `json:"metadata,omitempty"`
	leafHash       []byte
}

func (e *Entry) LeafData() ([]byte, error) {
	ordered := make([]MetadataPair, 0, len(e.Metadata))
	for k, v := range e.Metadata {
		ordered = append(ordered, MetadataPair{Key: k, Value: v})
	}
	sort.Slice(ordered, func(i, j int) bool { return ordered[i].Key < ordered[j].Key })

	payload := struct {
		ID             string         `json:"id"`
		Timestamp      string         `json:"timestamp"`
		Decision       string         `json:"decision,omitempty"`
		Redacted       bool           `json:"redacted"`
		DisclosureHash string         `json:"disclosure_hash,omitempty"`
		Metadata       []MetadataPair `json:"metadata,omitempty"`
	}{
		ID:        e.ID,
		Timestamp: e.Timestamp.UTC().Format(time.RFC3339Nano),
		Decision:  e.Decision,
		Redacted:  e.Redacted,
		Metadata:  ordered,
	}
	if e.Redacted {
		payload.DisclosureHash = e.DisclosureHash
	}

	return json.Marshal(payload)
}

func leafHash(data []byte) []byte {
	h := sha256.New()
	h.Write([]byte{0})
	h.Write(data)
	return h.Sum(nil)
}

func nodeHash(left, right []byte) []byte {
	h := sha256.New()
	h.Write([]byte{1})
	h.Write(left)
	h.Write(right)
	return h.Sum(nil)
}

type SignedTreeHead struct {
	TreeSize  int       `json:"tree_size"`
	RootHash  string    `json:"root_hash"`
	Timestamp time.Time `json:"timestamp"`
	Signature string    `json:"signature"`
}

type MerkleLog struct {
	mu         sync.RWMutex
	entries    []*Entry
	leafHashes [][]byte
	sthHistory []SignedTreeHead
	signFn     func([]byte) (string, error)
	pubKey     string
}

type Option func(*MerkleLog)

func WithSigner(signFn func([]byte) (string, error), pubKey string) Option {
	return func(m *MerkleLog) {
		m.signFn = signFn
		m.pubKey = pubKey
	}
}

func New(opts ...Option) *MerkleLog {
	ml := &MerkleLog{}
	for _, opt := range opts {
		opt(ml)
	}
	return ml
}

func (m *MerkleLog) Append(entry *Entry) (int, SignedTreeHead, error) {
	m.mu.Lock()
	defer m.mu.Unlock()

	data, err := entry.LeafData()
	if err != nil {
		return 0, SignedTreeHead{}, err
	}
	hash := leafHash(data)
	entry.leafHash = hash
	m.entries = append(m.entries, entry)
	m.leafHashes = append(m.leafHashes, hash)

	root := m.computeRoot()
	sth, err := m.buildSTH(len(m.leafHashes), root)
	if err != nil {
		return 0, SignedTreeHead{}, err
	}
	m.sthHistory = append(m.sthHistory, sth)
	return len(m.leafHashes) - 1, sth, nil
}

func (m *MerkleLog) Entries() []*Entry {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return append([]*Entry{}, m.entries...)
}

func (m *MerkleLog) Entry(index int) (*Entry, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	if index < 0 || index >= len(m.entries) {
		return nil, errors.New("entry index out of range")
	}
	return m.entries[index], nil
}

func (m *MerkleLog) EntryByID(id string) (*Entry, int, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	for i, e := range m.entries {
		if e.ID == id {
			return e, i, nil
		}
	}
	return nil, -1, errors.New("entry not found")
}

func (m *MerkleLog) LeafHash(index int) ([]byte, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	if index < 0 || index >= len(m.leafHashes) {
		return nil, errors.New("leaf index out of range")
	}
	return append([]byte(nil), m.leafHashes[index]...), nil
}

func (m *MerkleLog) LeafHashes(limit int) ([][]byte, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	if limit < 0 || limit > len(m.leafHashes) {
		return nil, errors.New("limit out of range")
	}
	hashes := make([][]byte, limit)
	for i := 0; i < limit; i++ {
		hashes[i] = append([]byte(nil), m.leafHashes[i]...)
	}
	return hashes, nil
}

func (m *MerkleLog) computeRoot() []byte {
	if len(m.leafHashes) == 0 {
		return nil
	}
	nodes := make([][]byte, len(m.leafHashes))
	for i := range m.leafHashes {
		nodes[i] = m.leafHashes[i]
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

func (m *MerkleLog) buildSTH(treeSize int, root []byte) (SignedTreeHead, error) {
	sth := SignedTreeHead{
		TreeSize:  treeSize,
		RootHash:  base64.StdEncoding.EncodeToString(root),
		Timestamp: time.Now().UTC(),
	}
	if m.signFn != nil {
		payload, err := json.Marshal(struct {
			TreeSize  int    `json:"tree_size"`
			RootHash  string `json:"root_hash"`
			Timestamp string `json:"timestamp"`
		}{TreeSize: sth.TreeSize, RootHash: sth.RootHash, Timestamp: sth.Timestamp.Format(time.RFC3339Nano)})
		if err != nil {
			return SignedTreeHead{}, err
		}
		sig, err := m.signFn(payload)
		if err != nil {
			return SignedTreeHead{}, err
		}
		sth.Signature = sig
	}
	return sth, nil
}

func (m *MerkleLog) LatestSTH() (SignedTreeHead, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	if len(m.sthHistory) == 0 {
		return SignedTreeHead{}, errors.New("log is empty")
	}
	return m.sthHistory[len(m.sthHistory)-1], nil
}

func (m *MerkleLog) AllSTHs() []SignedTreeHead {
	m.mu.RLock()
	defer m.mu.RUnlock()
	history := make([]SignedTreeHead, len(m.sthHistory))
	copy(history, m.sthHistory)
	return history
}

func (m *MerkleLog) InclusionProof(index int) ([][]byte, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	if index < 0 || index >= len(m.leafHashes) {
		return nil, errors.New("entry index out of range")
	}
	if len(m.leafHashes) == 0 {
		return nil, errors.New("log is empty")
	}
	proof := [][]byte{}
	level := make([][]byte, len(m.leafHashes))
	copy(level, m.leafHashes)
	idx := index
	for len(level) > 1 {
		if idx%2 == 0 {
			if idx+1 < len(level) {
				proof = append(proof, level[idx+1])
			}
		} else {
			proof = append(proof, level[idx-1])
		}
		var next [][]byte
		for i := 0; i < len(level); i += 2 {
			if i+1 < len(level) {
				next = append(next, nodeHash(level[i], level[i+1]))
			} else {
				next = append(next, level[i])
			}
		}
		level = next
		idx /= 2
	}
	return proof, nil
}

func (m *MerkleLog) subtreeHash(start, end int, memo map[[2]int][]byte) []byte {
	key := [2]int{start, end}
	if h, ok := memo[key]; ok {
		return h
	}
	if end-start == 1 {
		h := m.leafHashes[start]
		memo[key] = h
		return h
	}
	split := largestPowerOfTwoLessThan(end - start)
	if split == 0 {
		split = end - start - 1
	}
	left := m.subtreeHash(start, start+split, memo)
	right := m.subtreeHash(start+split, end, memo)
	h := nodeHash(left, right)
	memo[key] = h
	return h
}

func largestPowerOfTwoLessThan(n int) int {
	if n <= 1 {
		return 0
	}
	power := 1
	for power<<1 < n {
		power <<= 1
	}
	return power
}

func (m *MerkleLog) ConsistencyProof(oldSize, newSize int) ([][]byte, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	if oldSize < 1 || newSize < 1 {
		return nil, errors.New("tree sizes must be positive")
	}
	if oldSize > newSize {
		return nil, errors.New("old size cannot exceed new size")
	}
	if newSize > len(m.leafHashes) {
		return nil, errors.New("new size exceeds log size")
	}
	if oldSize == newSize {
		return [][]byte{}, nil
	}
	memo := make(map[[2]int][]byte)
	proof := m.consistencyProofRange(0, newSize, oldSize, memo)
	return proof, nil
}

func (m *MerkleLog) consistencyProofRange(start, end, msize int, memo map[[2]int][]byte) [][]byte {
	if msize == end-start {
		return [][]byte{}
	}
	split := largestPowerOfTwoLessThan(end - start)
	if split == 0 {
		split = end - start - 1
	}
	if msize <= split {
		proof := m.consistencyProofRange(start, start+split, msize, memo)
		right := m.subtreeHash(start+split, end, memo)
		proof = append(proof, right)
		return proof
	}
	proof := m.consistencyProofRange(start+split, end, msize-split, memo)
	left := m.subtreeHash(start, start+split, memo)
	proof = append(proof, left)
	return proof
}

func (m *MerkleLog) VerifyInclusion(index int, leafHash []byte, proof [][]byte, root []byte) bool {
	hash := leafHash
	idx := index
	for _, sibling := range proof {
		if idx%2 == 0 {
			hash = nodeHash(hash, sibling)
		} else {
			hash = nodeHash(sibling, hash)
		}
		idx /= 2
	}
	return string(hash) == string(root)
}

func (m *MerkleLog) VerifyConsistency(oldSize, newSize int, oldRoot, newRoot []byte, proof [][]byte) bool {
	if oldSize > newSize {
		return false
	}
	if oldSize == newSize {
		return string(oldRoot) == string(newRoot)
	}
	if oldSize == 0 {
		return true
	}
	mIndex := oldSize - 1
	nIndex := newSize - 1
	var oldHash, newHash []byte
	var consumed int
	for (mIndex & 1) == 1 {
		if consumed >= len(proof) {
			return false
		}
		oldHash = proof[consumed]
		newHash = proof[consumed]
		consumed++
		mIndex >>= 1
		nIndex >>= 1
	}
	if consumed >= len(proof) {
		return false
	}
	if oldHash == nil {
		oldHash = proof[consumed]
		newHash = proof[consumed]
		consumed++
	}
	for consumed <= len(proof) {
		if (mIndex & 1) == 1 {
			if consumed >= len(proof) {
				return false
			}
			oldHash = nodeHash(proof[consumed], oldHash)
			newHash = nodeHash(proof[consumed], newHash)
			consumed++
		} else {
			if consumed >= len(proof) {
				break
			}
			newHash = nodeHash(newHash, proof[consumed])
			consumed++
		}
		mIndex >>= 1
		nIndex >>= 1
		if mIndex == 0 {
			break
		}
	}
	return string(oldHash) == string(oldRoot) && string(newHash) == string(newRoot)
}

func (m *MerkleLog) PublicKey() string {
	return m.pubKey
}

func EncodeProof(proof [][]byte) []string {
	out := make([]string, len(proof))
	for i, p := range proof {
		out[i] = base64.StdEncoding.EncodeToString(p)
	}
	return out
}

func DecodeProof(encoded []string) ([][]byte, error) {
	out := make([][]byte, len(encoded))
	for i, e := range encoded {
		b, err := base64.StdEncoding.DecodeString(e)
		if err != nil {
			return nil, err
		}
		out[i] = b
	}
	return out, nil
}
