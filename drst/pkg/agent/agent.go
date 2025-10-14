package agent

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"math/rand"
	"time"

	"drst/pkg/config"
)

type Transaction struct {
	ID            string            `json:"id"`
	Jurisdiction  string            `json:"jurisdiction"`
	Tags          map[string]string `json:"tags"`
	Endpoint      string            `json:"endpoint"`
	CreatedAt     time.Time         `json:"createdAt"`
	PayloadDigest string            `json:"payloadDigest"`
}

type Agent struct {
	rng *rand.Rand
}

func New(seed int64) *Agent {
	src := rand.NewSource(seed)
	return &Agent{rng: rand.New(src)}
}

func (a *Agent) Generate(cfgJurisdiction config.Jurisdiction) ([]Transaction, error) {
	if cfgJurisdiction.TransactionCount <= 0 {
		return nil, fmt.Errorf("jurisdiction %s has no transactions configured", cfgJurisdiction.Name)
	}
	transactions := make([]Transaction, 0, cfgJurisdiction.TransactionCount*len(cfgJurisdiction.Routes))
	for _, route := range cfgJurisdiction.Routes {
		for i := 0; i < cfgJurisdiction.TransactionCount; i++ {
			created := time.Unix(0, a.rng.Int63())
			digest := randomDigest(a.rng)
			tx := Transaction{
				ID:            fmt.Sprintf("%s-%s-%d", cfgJurisdiction.Name, route.Endpoint, i),
				Jurisdiction:  cfgJurisdiction.Name,
				Tags:          cloneMap(cfgJurisdiction.Tags),
				Endpoint:      route.Endpoint,
				CreatedAt:     created.UTC(),
				PayloadDigest: digest,
			}
			transactions = append(transactions, tx)
		}
	}
	return transactions, nil
}

func cloneMap(in map[string]string) map[string]string {
	if len(in) == 0 {
		return nil
	}
	out := make(map[string]string, len(in))
	for k, v := range in {
		out[k] = v
	}
	return out
}

func randomDigest(rng *rand.Rand) string {
	payload := make([]byte, 64)
	for i := range payload {
		payload[i] = byte(rng.Intn(256))
	}
	sum := sha256.Sum256(payload)
	return hex.EncodeToString(sum[:])
}
