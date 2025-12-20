package fae

import "strings"

// ShapleyAttribution allocates fractional credit to each channel.
func ShapleyAttribution(pathConversions map[string]float64) map[string]float64 {
	contributions := make(map[string]float64)
	total := 0.0
	for key, conversions := range pathConversions {
		path := decodePath(key)
		unique := uniqueChannels(path)
		if len(unique) == 0 {
			continue
		}
		weight := conversions / float64(len(unique))
		for _, channel := range unique {
			contributions[channel] += weight
		}
		total += conversions
	}
	if total == 0 {
		return contributions
	}
	for channel, value := range contributions {
		contributions[channel] = value / total
	}
	return contributions
}

func decodePath(key string) []string {
	if key == "" {
		return nil
	}
	return strings.Split(key, ">")
}

func uniqueChannels(path []string) []string {
	seen := make(map[string]struct{})
	ordered := make([]string, 0, len(path))
	for _, channel := range path {
		if _, ok := seen[channel]; ok {
			continue
		}
		seen[channel] = struct{}{}
		ordered = append(ordered, channel)
	}
	return ordered
}

// MarkovAttribution estimates removal effects similar to the Python implementation.
func MarkovAttribution(pathConversions map[string]float64) map[string]float64 {
	total := 0.0
	for _, conversions := range pathConversions {
		total += conversions
	}
	if total == 0 {
		return map[string]float64{}
	}
	channels := make(map[string]struct{})
	for key := range pathConversions {
		for _, channel := range decodePath(key) {
			channels[channel] = struct{}{}
		}
	}
	removal := make(map[string]float64)
	for channel := range channels {
		affected := 0.0
		for key, conversions := range pathConversions {
			path := decodePath(key)
			if contains(path, channel) {
				affected += conversions
			}
		}
		diff := affected / total
		if diff < 0 {
			diff = 0
		}
		removal[channel] = diff
	}
	effectSum := 0.0
	for _, value := range removal {
		effectSum += value
	}
	if effectSum == 0 {
		for channel := range removal {
			removal[channel] = 0
		}
		return removal
	}
	for channel, value := range removal {
		removal[channel] = value / effectSum
	}
	return removal
}

func contains(path []string, target string) bool {
	for _, channel := range path {
		if channel == target {
			return true
		}
	}
	return false
}
