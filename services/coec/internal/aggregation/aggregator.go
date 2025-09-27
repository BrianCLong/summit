package aggregation

import (
	"crypto/sha512"
	"encoding/base64"
	"encoding/binary"
	"encoding/json"
	"errors"
	"fmt"
	"math"
	"math/rand"
	"sort"
	"strings"
)

// MetricDefinition describes how a KPI should be aggregated.
type MetricDefinition struct {
	Name          string  `json:"name"`
	Aggregation   string  `json:"aggregation"`
	Sensitivity   float64 `json:"sensitivity"`
	Description   string  `json:"description,omitempty"`
	LowerIsBetter bool    `json:"lowerIsBetter,omitempty"`
}

// DPConfig configures optional Laplace noise for secure aggregation.
type DPConfig struct {
	Epsilon     float64 `json:"epsilon"`
	Delta       float64 `json:"delta"`
	Sensitivity float64 `json:"sensitivity"`
}

// ContributionShare is compatible with FTMA-style masked value reporting.
type ContributionShare struct {
	Mask    float64            `json:"mask"`
	Metrics map[string]float64 `json:"metrics"`
	Count   int                `json:"count"`
}

// Contribution represents a single org's aggregated submission for a cohort.
type Contribution struct {
	OrgID  string            `json:"orgId"`
	Cohort string            `json:"cohort"`
	Share  ContributionShare `json:"share"`
}

type metricAggregate struct {
	sum   float64
	sumsq float64
	count int
}

// State maintains aggregated statistics without retaining partner level details.
type State struct {
	metrics    map[string]map[string]map[string]*metricAggregate // org -> cohort -> metric -> aggregate
	registered map[string]MetricDefinition
	dpConfig   *DPConfig
	randomSalt []byte
}

// NewState constructs a State configured for the provided metrics.
func NewState(defs []MetricDefinition, dp *DPConfig, randomSalt []byte) *State {
	reg := make(map[string]MetricDefinition)
	for _, def := range defs {
		reg[def.Name] = def
	}
	return &State{
		metrics:    make(map[string]map[string]map[string]*metricAggregate),
		registered: reg,
		dpConfig:   dp,
		randomSalt: append([]byte(nil), randomSalt...),
	}
}

// ApplyContribution ingests a masked contribution share and updates aggregated statistics.
func (s *State) ApplyContribution(c Contribution) error {
	if c.Share.Count <= 0 {
		return errors.New("count must be positive")
	}
	if _, ok := s.metrics[c.OrgID]; !ok {
		s.metrics[c.OrgID] = make(map[string]map[string]*metricAggregate)
	}
	if _, ok := s.metrics[c.OrgID][c.Cohort]; !ok {
		s.metrics[c.OrgID][c.Cohort] = make(map[string]*metricAggregate)
	}
	for name, value := range c.Share.Metrics {
		def, ok := s.registered[name]
		if !ok {
			return fmt.Errorf("metric %s is not registered", name)
		}
		agg, ok := s.metrics[c.OrgID][c.Cohort][name]
		if !ok {
			agg = &metricAggregate{}
			s.metrics[c.OrgID][c.Cohort][name] = agg
		}
		actual := value - c.Share.Mask
		if stringsEqualFold(def.Aggregation, "mean") {
			weighted := actual * float64(c.Share.Count)
			agg.sum += weighted
			agg.sumsq += actual * actual * float64(c.Share.Count)
		} else {
			agg.sum += actual
			agg.sumsq += actual * actual
		}
		agg.count += c.Share.Count
	}
	return nil
}

// CohortResult summarises aggregated metrics for a single cohort.
type CohortResult struct {
	Metrics map[string]MetricResult `json:"metrics"`
	Count   int                     `json:"count"`
}

// MetricResult contains summary stats and privacy annotations.
type MetricResult struct {
	Value        float64 `json:"value"`
	NoiseApplied bool    `json:"noiseApplied"`
	StdError     float64 `json:"stdError"`
	Aggregation  string  `json:"aggregation"`
}

// OrgResult is the complete aggregated view for an organisation.
type OrgResult struct {
	OrgID    string                  `json:"orgId"`
	Cohorts  map[string]CohortResult `json:"cohorts"`
	DPConfig *DPConfig               `json:"dpConfig,omitempty"`
}

// ResultsCollection is a sorted slice of org results for deterministic serialisation.
type ResultsCollection []OrgResult

func (r ResultsCollection) Len() int           { return len(r) }
func (r ResultsCollection) Less(i, j int) bool { return r[i].OrgID < r[j].OrgID }
func (r ResultsCollection) Swap(i, j int)      { r[i], r[j] = r[j], r[i] }

// Snapshot finalises the aggregated statistics and emits deterministic results per org/cohort/metric.
func (s *State) Snapshot(experimentID string) (ResultsCollection, error) {
	results := make([]OrgResult, 0, len(s.metrics))
	for orgID, cohorts := range s.metrics {
		cohortRes := make(map[string]CohortResult)
		for cohortName, metrics := range cohorts {
			metricResults := make(map[string]MetricResult)
			var totalCount int
			for metricName, agg := range metrics {
				def := s.registered[metricName]
				value := agg.sum
				if stringsEqualFold(def.Aggregation, "mean") && agg.count > 0 {
					value = agg.sum / float64(agg.count)
				}
				noiseApplied := false
				stdErr := computeStdError(def.Aggregation, agg)
				if s.dpConfig != nil && s.dpConfig.Epsilon > 0 {
					noise := s.laplaceNoise(experimentID, orgID, cohortName, metricName)
					value += noise
					noiseApplied = true
				}
				metricResults[metricName] = MetricResult{
					Value:        value,
					NoiseApplied: noiseApplied,
					StdError:     stdErr,
					Aggregation:  def.Aggregation,
				}
				totalCount = agg.count
			}
			cohortRes[cohortName] = CohortResult{Metrics: metricResults, Count: totalCount}
		}
		results = append(results, OrgResult{OrgID: orgID, Cohorts: cohortRes, DPConfig: s.dpConfig})
	}
	sort.Sort(ResultsCollection(results))
	return results, nil
}

func (s *State) laplaceNoise(experimentID, orgID, cohort, metric string) float64 {
	if s.dpConfig == nil || s.dpConfig.Epsilon == 0 {
		return 0
	}
	scale := s.dpConfig.Sensitivity / math.Max(s.dpConfig.Epsilon, 1e-9)
	seedMaterial := struct {
		Experiment string `json:"experiment"`
		Org        string `json:"org"`
		Cohort     string `json:"cohort"`
		Metric     string `json:"metric"`
		Salt       []byte `json:"salt"`
	}{
		Experiment: experimentID,
		Org:        orgID,
		Cohort:     cohort,
		Metric:     metric,
		Salt:       s.randomSalt,
	}
	bytes, _ := json.Marshal(seedMaterial)
	hash := sha512.Sum512(bytes)
	seed := int64(binary.BigEndian.Uint64(hash[:8]))
	r := rand.New(rand.NewSource(seed))
	u := r.Float64() - 0.5
	if u == 0 {
		u = 1e-9
	}
	return scale * math.Copysign(1, u) * math.Log(1-2*math.Abs(u))
}

func computeStdError(kind string, agg *metricAggregate) float64 {
	if agg.count == 0 {
		return 0
	}
	if stringsEqualFold(kind, "mean") {
		mean := agg.sum / float64(agg.count)
		variance := agg.sumsq/float64(agg.count) - mean*mean
		if variance < 0 {
			variance = 0
		}
		return math.Sqrt(variance) / math.Sqrt(float64(agg.count))
	}
	return math.Sqrt(agg.sumsq) / float64(agg.count)
}

func stringsEqualFold(a, b string) bool {
	return strings.EqualFold(strings.TrimSpace(a), strings.TrimSpace(b))
}

// SerializeResults produces a canonical JSON representation for signing.
func SerializeResults(results ResultsCollection) (string, error) {
	clone := make([]OrgResult, len(results))
	copy(clone, results)
	sort.Sort(ResultsCollection(clone))
	data, err := json.Marshal(clone)
	if err != nil {
		return "", err
	}
	return base64.StdEncoding.EncodeToString(data), nil
}
