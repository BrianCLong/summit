package risk

import "fmt"

// Level represents the aggregated risk level determined by the engine.
type Level int

const (
	LevelLow Level = iota
	LevelMedium
	LevelHigh
)

func (l Level) String() string {
	switch l {
	case LevelLow:
		return "low"
	case LevelMedium:
		return "medium"
	case LevelHigh:
		return "high"
	default:
		return fmt.Sprintf("unknown(%d)", int(l))
	}
}

// Signals captures the core telemetry that feeds risk scorers.
type Signals struct {
	Geo           string         `json:"geo"`
	DevicePosture string         `json:"devicePosture"`
	AnomalyScore  float64        `json:"anomalyScore"`
	Additional    map[string]any `json:"additional,omitempty"`
}

// Input represents the data provided to risk scorers.
type Input struct {
	Signals  Signals
	Subject  map[string]string
	Resource map[string]string
	Action   string
}

// Result captures the outcome of a risk scorer evaluation.
type Result struct {
	Name    string
	Level   Level
	Score   float64
	Reasons []string
}

// Scorer evaluates a set of signals and produces a risk result.
type Scorer interface {
	Score(in Input) Result
}

// CombineLevels returns the highest severity level from a set of results.
func CombineLevels(results []Result) Level {
	highest := LevelLow
	for _, res := range results {
		if res.Level > highest {
			highest = res.Level
		}
	}
	return highest
}
