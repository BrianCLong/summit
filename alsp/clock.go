package alsp

import "time"

type clock interface {
	Now() time.Time
}

type systemClock struct{}

func (systemClock) Now() time.Time { return time.Now() }

// fakeClock is exported in tests to provide deterministic durations.
type fakeClock struct {
	times []time.Time
	idx   int
}

func (f *fakeClock) Now() time.Time {
	if len(f.times) == 0 {
		return time.Now()
	}
	if f.idx >= len(f.times) {
		return f.times[len(f.times)-1]
	}
	t := f.times[f.idx]
	f.idx++
	return t
}
