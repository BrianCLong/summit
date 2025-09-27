package detectors

import "strings"

func computeLineCol(content []byte, idx int) (int, int) {
	line := 1
	col := 1
	for i := 0; i < idx && i < len(content); i++ {
		if content[i] == '\n' {
			line++
			col = 1
		} else {
			col++
		}
	}
	return line, col
}

func contextWindow(content []byte, start, end, window int) string {
	if window <= 0 {
		window = 16
	}
	lo := start - window
	if lo < 0 {
		lo = 0
	}
	hi := end + window
	if hi > len(content) {
		hi = len(content)
	}
	return strings.TrimSpace(string(content[lo:hi]))
}
