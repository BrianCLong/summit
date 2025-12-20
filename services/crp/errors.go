package crp

import "fmt"

// ErrInvalidEvent is returned when mandatory event fields are missing.
type ErrInvalidEvent string

func (e ErrInvalidEvent) Error() string {
	return fmt.Sprintf("invalid event: %s", string(e))
}
