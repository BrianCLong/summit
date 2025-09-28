package orchestrator

import "time"

// BuildPartitions creates deterministic contiguous partitions.
func BuildPartitions(start, end time.Time, chunkSize time.Duration) []Partition {
	if chunkSize <= 0 {
		return nil
	}
	partitions := []Partition{}
	index := 0
	cursor := start
	for cursor.Before(end) {
		next := cursor.Add(chunkSize)
		if next.After(end) {
			next = end
		}
		partitions = append(partitions, Partition{
			Index:     index,
			RangeFrom: cursor,
			RangeTo:   next,
		})
		cursor = next
		index++
	}
	return partitions
}
