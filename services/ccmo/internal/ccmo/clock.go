package ccmo

import "time"

// Clock abstracts time retrieval for deterministic testing.
type Clock interface {
	Now() time.Time
}

// RealClock implements Clock using the system time.
type RealClock struct{}

// Now returns the current time.
func (RealClock) Now() time.Time {
	return time.Now()
}
